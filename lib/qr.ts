import QRCode from 'qrcode';
import { Recipient, FieldsState } from '@/types';
import { formatDateDDMMYYYY } from '@/lib/date';

/**
 * Generates a PNG base64 Data URL for the given text payload using QRCode.
 * Fast, pure client-side/Node execution with no external network calls.
 */
export async function generateQrDataUrl(text: string, size: number = 200): Promise<string> {
  if (!text || !text.trim()) return '';
  try {
    const dataUrl = await QRCode.toDataURL(text.trim(), {
      width: size,
      margin: 1,
      color: {
        dark: '#111111',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate QR code data URL:', err);
    return '';
  }
}

/**
 * Builds the verification text payload for the QR code by resolving dynamic placeholders:
 * {name}, {id}, {date}, {event}, {course}, and any custom Excel column values.
 */
export function buildQrPayload(
  template: string,
  recipient: Recipient,
  eventName: string = 'Certificate Event',
  fields?: FieldsState
): string {
  if (!template) {
    template = 'VERIFIED CERTIFICATE\nID: {id}\nRecipient: {name}\nEvent: {event}\nDate: {date}\nStatus: Verified Authentic';
  }

  let result = template
    .replace(/\{\{name\}\}|\{name\}/gi, recipient.name || '')
    .replace(/\{\{id\}\}|\{id\}/gi, recipient.certId || `CERT-${String(recipient.id || 1).padStart(4, '0')}`)
    .replace(/\{\{date\}\}|\{date\}/gi, formatDateDDMMYYYY(recipient.date))
    .replace(/\{\{event\}\}|\{event\}/gi, eventName)
    .replace(/\{\{course\}\}|\{course\}/gi, recipient.course || eventName);

  // If there are custom fields or recipient.raw columns, replace those too:
  // e.g. {Team Name} or {team_name} or {College}
  if (recipient.raw) {
    for (const [colName, val] of Object.entries(recipient.raw)) {
      const sanitizedKey = colName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const cleanVal = val !== undefined && val !== null ? String(val) : '';
      const regex1 = new RegExp(`\\{${colName}\\}|\\{\\{${colName}\\}\\}`, 'gi');
      const regex2 = new RegExp(`\\{${sanitizedKey}\\}|\\{\\{${sanitizedKey}\\}\\}`, 'gi');
      result = result.replace(regex1, cleanVal).replace(regex2, cleanVal);
    }
  }

  return result.trim();
}
