import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// SSRF Protection: Deny cloud metadata and link-local addresses
function isForbiddenHost(host: string): boolean {
  const h = String(host || '').toLowerCase().trim();
  if (!h) return true;
  if (h === '169.254.169.254' || h.startsWith('169.254.') || h === 'metadata.google.internal') {
    return true;
  }
  if (h === '0.0.0.0' || h === '::' || h === '[::]') {
    return true;
  }
  return false;
}

// CRLF Injection prevention for email headers
function sanitizeHeader(val: string): string {
  return String(val || '').replace(/[\r\n]+/g, ' ').trim();
}

// Strict email format validation
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export async function POST(req: NextRequest) {
  let passedPass = '';
  try {
    const body = await req.json();
    const {
      smtpConfig,
      recipient,
      emailSubject,
      emailBody,
      attachmentDataUrl,
      attachmentFilename
    } = body;

    if (!recipient || !recipient.email) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    const cleanEmail = String(recipient.email).trim();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json({ error: 'Invalid recipient email format' }, { status: 400 });
    }

    if (smtpConfig?.mockMode) {
      console.log(`[MOCK EMAIL] To: ${cleanEmail} | Subject: ${sanitizeHeader(emailSubject)} | Attachment: ${attachmentFilename}`);
      return NextResponse.json({
        success: true,
        simulated: true,
        message: `[Simulated] Email to ${cleanEmail} logged successfully!`
      });
    }

    if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      return NextResponse.json({ error: 'SMTP Configuration is missing or incomplete.' }, { status: 400 });
    }

    const host = String(smtpConfig.host).trim();
    if (isForbiddenHost(host)) {
      return NextResponse.json({ error: 'Prohibited SMTP host target.' }, { status: 400 });
    }

    const port = Number(smtpConfig.port);
    if (isNaN(port) || port < 1 || port > 65535) {
      return NextResponse.json({ error: 'Invalid SMTP port specified.' }, { status: 400 });
    }

    passedPass = String(smtpConfig.pass).trim();

    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: Boolean(smtpConfig.secure),
      auth: {
        user: String(smtpConfig.user).trim(),
        pass: passedPass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const attachments: any[] = [];
    if (attachmentDataUrl) {
      // Check attachment payload size ceiling (max 35MB base64 dataUrl)
      if (typeof attachmentDataUrl === 'string' && attachmentDataUrl.length > 35 * 1024 * 1024) {
        return NextResponse.json({ error: 'Attachment exceeds maximum safety limit (25MB)' }, { status: 413 });
      }

      const commaIdx = attachmentDataUrl.indexOf(',');
      const base64Data = commaIdx !== -1 ? attachmentDataUrl.slice(commaIdx + 1) : attachmentDataUrl;
      const buffer = Buffer.from(base64Data, 'base64');

      // Sanitize attachment filename against path traversal / zip-slip attacks
      const safeName = String(attachmentFilename || `Certificate-${recipient.name || 'document'}.pdf`)
        .replace(/^.*[\\\/]/, '')
        .replace(/[^a-zA-Z0-9_.-]/g, '_')
        .replace(/^\.+/, '');

      let contentType = 'application/pdf';
      if (safeName.endsWith('.png')) {
        contentType = 'image/png';
      } else if (safeName.endsWith('.jpg') || safeName.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      }

      attachments.push({
        filename: safeName || 'Certificate.pdf',
        content: buffer,
        contentType: contentType
      });
    }

    const replaceVars = (text: string) => {
      if (!text) return '';
      return text
        .replace(/\{\{name\}\}/gi, recipient.name || '')
        .replace(/\{name\}/gi, recipient.name || '')
        .replace(/\{\{email\}\}/gi, cleanEmail)
        .replace(/\{email\}/gi, cleanEmail)
        .replace(/\{\{date\}\}/gi, recipient.date || '')
        .replace(/\{date\}/gi, recipient.date || '')
        .replace(/\{\{id\}\}/gi, recipient.certId || '')
        .replace(/\{id\}/gi, recipient.certId || '')
        .replace(/\{\{course\}\}/gi, recipient.course || '')
        .replace(/\{course\}/gi, recipient.course || '');
    };

    // Sanitize subject header to eliminate CRLF injection
    const rawSubject = replaceVars(emailSubject || 'Your Certificate of Achievement');
    const finalSubject = sanitizeHeader(rawSubject);

    const processedText = replaceVars(
      emailBody ||
        'Dear {name},\n\nCongratulations! Please find attached your verified certificate.\n\nWarm regards,\nEvent Organizing Committee'
    );

    // Escape HTML entities to prevent mangling of angle brackets or email addresses
    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    // Only bypass if the user explicitly provided full HTML document/block markup
    const hasHtmlBlocks =
      /<\s*(p|div|html|body|table)[\s>]/i.test(processedText) &&
      /<\s*\/(p|div|html|body|table)\s*>/i.test(processedText);

    let finalHtml = '';
    if (hasHtmlBlocks) {
      finalHtml = processedText;
    } else {
      // Clean, uncolored simple email body with 1:1 preserved paragraph spacing and line breaks
      const normalized = processedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const rawParagraphs = normalized.split(/\n\s*\n/);

      while (rawParagraphs.length > 0 && rawParagraphs[0].trim() === '') {
        rawParagraphs.shift();
      }
      while (rawParagraphs.length > 0 && rawParagraphs[rawParagraphs.length - 1].trim() === '') {
        rawParagraphs.pop();
      }

      const pStyle = 'margin: 0 0 16px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #111111;';

      const htmlParagraphs = rawParagraphs.map(para => {
        const trimmed = para.trim();
        if (!trimmed) {
          return `<p style="${pStyle}">&nbsp;</p>`;
        }
        const withBreaks = trimmed
          .split('\n')
          .map(line => escapeHtml(line))
          .join('<br />');

        return `<p style="${pStyle}">${withBreaks}</p>`;
      });

      finalHtml = `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #111111;">\n${htmlParagraphs.join('\n')}\n</div>`;
    }

    const cleanSenderName = smtpConfig.senderName ? sanitizeHeader(smtpConfig.senderName) : '';
    const senderDisplay = cleanSenderName
      ? `"${cleanSenderName}" <${String(smtpConfig.user).trim()}>`
      : String(smtpConfig.user).trim();

    const info = await transporter.sendMail({
      from: senderDisplay,
      to: cleanEmail,
      subject: finalSubject,
      text: processedText,
      html: finalHtml,
      attachments: attachments
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: `Email successfully sent to ${cleanEmail}!`
    });

  } catch (err: any) {
    console.error('Email send error:', err);
    let msg = String(err?.message || 'Failed to dispatch email');
    if (passedPass && passedPass.length > 0) {
      msg = msg.split(passedPass).join('******');
    }
    return NextResponse.json({ error: `Failed to send email: ${msg}` }, { status: 500 });
  }
}
