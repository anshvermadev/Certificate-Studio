import jsPDF from 'jspdf';
import { Recipient, FieldsState, QrCodeConfig } from '@/types';
import { formatDateDDMMYYYY } from '@/lib/date';
import { generateQrDataUrl, buildQrPayload } from '@/lib/qr';

/**
 * Renders the recipient data and optional verification QR code onto the certificate
 * template image canvas and returns a high-resolution PDF data URI.
 */
export async function generateCertificatePdf(
  recipient: Recipient,
  templateImage: HTMLImageElement | null,
  fields: FieldsState,
  qrConfig?: QrCodeConfig,
  eventName?: string
): Promise<{ filename: string; dataUrl: string }> {
  // If no template image yet, create a fallback canvas
  const canvasWidth = templateImage?.naturalWidth || 1920;
  const canvasHeight = templateImage?.naturalHeight || 1080;

  const offscreen = document.createElement('canvas');
  offscreen.width = canvasWidth;
  offscreen.height = canvasHeight;
  const ctx = offscreen.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d canvas context');

  if (templateImage && templateImage.complete && templateImage.naturalWidth > 0) {
    ctx.drawImage(templateImage, 0, 0, offscreen.width, offscreen.height);
  } else {
    // Elegant fallback background if no template image
    const grad = ctx.createLinearGradient(0, 0, offscreen.width, offscreen.height);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(1, '#F5F0EB');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);

    ctx.strokeStyle = '#D72638';
    ctx.lineWidth = 12;
    ctx.strokeRect(30, 30, offscreen.width - 60, offscreen.height - 60);
  }

  // Render all active text fields (both core and custom Excel columns)
  Object.keys(fields).forEach(key => {
    const f = fields[key];
    if (!f || f.enabled === false) return;

    let text = '';
    if (key === 'name') {
      text = recipient.name || '';
    } else if (key === 'date') {
      text = formatDateDDMMYYYY(recipient.date);
    } else if (key === 'certId') {
      text = recipient.certId || `CERT-${String(recipient.id || 1).padStart(4, '0')}`;
    } else {
      // Dynamic custom field (e.g. from Excel column)
      const col = f.columnKey || key;
      text = recipient.raw && recipient.raw[col] !== undefined && recipient.raw[col] !== null
        ? String(recipient.raw[col])
        : ((recipient as any)[key] || '');
    }

    if (f.customPrefix) text = f.customPrefix + text;
    if (f.uppercase) text = text.toUpperCase();

    const posX = (f.x / 100) * offscreen.width;
    const posY = (f.y / 100) * offscreen.height;

    let fontStyle = '';
    if (f.italic) fontStyle += 'italic ';
    if (f.bold) fontStyle += 'bold ';
    ctx.font = `${fontStyle}${f.fontSize}px ${f.fontFamily}`;
    ctx.fillStyle = f.color;
    ctx.textAlign = f.align || 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(text, posX, posY);
  });

  // Render self-contained verification QR Code if enabled
  if (qrConfig && qrConfig.enabled) {
    const payload = buildQrPayload(qrConfig.payloadTemplate, recipient, eventName || 'Certificate Event', fields);
    const qrDataUrl = await generateQrDataUrl(payload, Math.max(qrConfig.size * 2, 200));

    if (qrDataUrl) {
      await new Promise<void>(resolve => {
        const qrImg = new Image();
        qrImg.onload = () => {
          // Scale size proportionally relative to 1000px reference canvas
          const qrW = (qrConfig.size / 1000) * offscreen.width;
          const qrH = qrW;
          const qrX = (qrConfig.x / 100) * offscreen.width - qrW / 2;
          const qrY = (qrConfig.y / 100) * offscreen.height - qrH / 2;

          // Crisp white background pad to ensure scannability on dark/textured backgrounds
          ctx.save();
          ctx.fillStyle = '#FFFFFF';
          const pad = Math.max(qrW * 0.05, 4);
          if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(qrX - pad, qrY - pad, qrW + pad * 2, qrH + pad * 2, pad);
            ctx.fill();
          } else {
            ctx.fillRect(qrX - pad, qrY - pad, qrW + pad * 2, qrH + pad * 2);
          }

          ctx.drawImage(qrImg, qrX, qrY, qrW, qrH);
          ctx.restore();
          resolve();
        };
        qrImg.onerror = () => resolve();
        qrImg.src = qrDataUrl;
      });
    }
  }

  const dataUrl = offscreen.toDataURL('image/png', 1.0);
  const isLandscape = offscreen.width >= offscreen.height;
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [offscreen.width * 0.75, offscreen.height * 0.75]
  });

  doc.addImage(dataUrl, 'PNG', 0, 0, offscreen.width * 0.75, offscreen.height * 0.75, undefined, 'FAST');
  const pdfDataUri = doc.output('datauristring');
  const cleanName = (recipient.name || 'Recipient').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Certificate-${cleanName}.pdf`;

  return { filename, dataUrl: pdfDataUri };
}

/**
 * Downloads a single certificate PDF directly in the browser.
 */
export async function downloadCertificatePdf(
  recipient: Recipient,
  templateImage: HTMLImageElement | null,
  fields: FieldsState,
  qrConfig?: QrCodeConfig,
  eventName?: string
): Promise<void> {
  const { filename, dataUrl } = await generateCertificatePdf(recipient, templateImage, fields, qrConfig, eventName);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
