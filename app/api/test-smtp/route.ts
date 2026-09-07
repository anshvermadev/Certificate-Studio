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

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export async function POST(req: NextRequest) {
  let passedPass = '';
  try {
    const body = await req.json();
    const { host, port, secure, user, pass, testEmail, mockMode } = body;

    if (mockMode) {
      return NextResponse.json({
        success: true,
        message: 'Mock Mode Active: SMTP connection simulated successfully! (Emails will be logged in console/UI without actual dispatch).'
      });
    }

    if (!host || !port || !user || !pass) {
      return NextResponse.json({ error: 'Missing SMTP host, port, username, or password' }, { status: 400 });
    }

    const cleanHost = String(host).trim();
    if (isForbiddenHost(cleanHost)) {
      return NextResponse.json({ error: 'Prohibited SMTP host target.' }, { status: 400 });
    }

    const numPort = Number(port);
    if (isNaN(numPort) || numPort < 1 || numPort > 65535) {
      return NextResponse.json({ error: 'Invalid SMTP port specified.' }, { status: 400 });
    }

    passedPass = String(pass).trim();

    const transporter = nodemailer.createTransport({
      host: cleanHost,
      port: numPort,
      secure: Boolean(secure),
      auth: {
        user: String(user).trim(),
        pass: passedPass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.verify();

    if (testEmail) {
      const cleanTestEmail = String(testEmail).trim();
      if (!EMAIL_REGEX.test(cleanTestEmail)) {
        return NextResponse.json({ error: 'Invalid test email address format.' }, { status: 400 });
      }

      const cleanUserPrefix = String(user).split('@')[0].replace(/[\r\n]+/g, '');
      await transporter.sendMail({
        from: `"${cleanUserPrefix}" <${String(user).trim()}>`,
        to: cleanTestEmail,
        subject: 'Certificate Studio - SMTP Test Successful',
        text: 'Your email configuration is working properly! You are ready to send certificates.',
        html: '<div style="font-family: Arial, sans-serif; padding: 20px; border-left: 4px solid #10B981; background: #F0FDF4;"><h3>Success!</h3><p>Your SMTP configuration has been verified. You can now dispatch certificates in bulk or individually.</p></div>'
      });
    }

    return NextResponse.json({
      success: true,
      message: testEmail ? `SMTP Verified & test email sent to ${testEmail}!` : 'SMTP Server Connection Verified Successfully!'
    });
  } catch (err: any) {
    console.error('SMTP test error:', err);
    let msg = String(err?.message || 'SMTP connection failed');
    if (passedPass && passedPass.length > 0) {
      msg = msg.split(passedPass).join('******');
    }
    return NextResponse.json({ error: `SMTP connection failed: ${msg}` }, { status: 500 });
  }
}

