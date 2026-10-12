# 🎓 Certificate Studio (Next.js App Router)

> **Modern, Serverless-Ready Certificate Generation & Email Dispatch Platform built with Next.js 14, TypeScript, Tailwind CSS, and IndexedDB.**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Security: Hardened](https://img.shields.io/badge/Security-Hardened-green?style=flat-square)](https://github.com)

---

## 🌟 Highlights

- **Zero-Database Local-First Architecture**: Powered by client-side **IndexedDB** with transparent localStorage fallback. Participant rosters and templates never touch a centralized database.
- **Self-Contained Verification QR Engine**: Generates domain-independent `CERT_VERIFY_v1` QR codes with SHA-256 verification hash, scan-verifiable on any smartphone without an external server.
- **Dynamic Excel Columns & Custom Fields**: Automatically detects custom spreadsheet columns (`Team Name`, `Track`, `Rank`, etc.) and turns them into interactive canvas text layers.
- **Visual Canvas Designer**: Click-to-position or slider placement with 0.1% micro-steppers, curated Google Fonts, and full typography controls.
- **Automated Status Reconciliation Engine**: Synchronizes recipient dispatch statuses (`Ready`, `Sent`, `Failed`) automatically from audit logs on load.
- **Individual & Bulk Throttled Dispatch**: Send certificates individually or run automated bulk delivery with configurable throttling and mock mode simulation.
- **High-Resolution Export**: Vector-quality client-side PDF export (`jsPDF`) and batch ZIP packaging (`JSZip`).

---

## 🔒 Security Hardening

All Next.js API routes are protected with defense-in-depth security:

- **SSRF Defense (`/api/send-email`, `/api/test-smtp`)**: Blocks requests to cloud metadata (`169.254.169.254`, `metadata.google.internal`), link-local IPs, and loopbacks.
- **CRLF Injection Prevention**: Strips carriage returns and newlines from subject lines and sender names to block header injection.
- **Zip-Slip Protection (`/api/package-zip`)**: Filename sanitization against directory traversal (`../`, `..\`) and batch capping at 1,000 items.
- **Prototype Pollution Defense (`/api/upload-excel`)**: Filters out hazardous keys (`__proto__`, `constructor`, `prototype`) and sanitizes cell data.
- **Payload & DoS Protection**: 25MB spreadsheet ceiling, 10,000 parsed row limit, 35MB attachment ceiling.
- **Credential Hygiene**: Automatically scrubs passwords and secrets from error responses.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production
```bash
npm run build
npm run start
```

---

## 🧪 Testing

```bash
# Run API & End-to-End integration tests
node test-next.js

# Run Security hardening verification suite
node scratch/test-security.js

# Run TypeScript compilation check
npx tsc --noEmit
```

---

## 📁 Architecture

```
certificate-generator-next/
├── app/
│   ├── api/
│   │   ├── upload-excel/         # Ingests & sanitizes spreadsheets
│   │   ├── send-email/           # Hardened outbound SMTP dispatch
│   │   ├── test-smtp/            # SMTP connection verification
│   │   └── package-zip/          # Serverless ZIP generator with Zip-Slip defense
│   ├── events/
│   │   ├── new/                  # Event creation wizard
│   │   └── [eventId]/
│   │       ├── page.tsx          # Event overview & metrics dashboard
│   │       ├── upload/           # Template & roster upload interface
│   │       ├── design/           # Visual canvas designer & field positioning
│   │       ├── recipients/       # Recipient data grid & status reconciliation
│   │       ├── dispatch/         # Bulk email dispatch, SMTP configuration & logs
│   │       └── settings/         # Event configuration & data export
│   ├── layout.tsx                # Root layout with Unified Navigation Bar
│   ├── globals.css               # Claymorphic design tokens & shadows
│   └── page.tsx                  # Workspace homepage
├── components/                   # Modular React Components
├── context/                      # React Context providers (EventContext)
├── lib/                          # Core engines (PDF, QR, storage, reconciliation)
├── types/                        # TypeScript interfaces
└── test-next.js                  # Automated test suite
```

---

## ☁️ Deploying to Vercel

1. Push your code to GitHub / GitLab / Bitbucket.
2. In the [Vercel Dashboard](https://vercel.com), click **Add New Project**.
3. Select this repository and set the root directory to `certificate-generator-next`.
4. Deploy! No environment variables or external databases are required for basic usage.

---

## 📧 SMTP Provider Setup Guides & URLs

### 1. ✉️ Gmail / Google Workspace (App Password)
> **Note:** Your regular Google account password will **not** work. Google requires a 16-character App Password.

1. **Enable 2-Step Verification:** [Google 2-Step Verification Settings](https://myaccount.google.com/signinoptions/two-step-verification)
2. **Generate App Password:** Go directly to [Google App Passwords](https://myaccount.google.com/apppasswords).
3. Enter app name `Certificate Studio`, click **Create**, and copy the 16-letter code (`xxxx xxxx xxxx xxxx`).
4. In Certificate Studio SMTP settings:
   - **Host:** `smtp.gmail.com`
   - **Port:** `465` (SSL)
   - **Email / Username:** Your full `@gmail.com` address
   - **Password:** Paste the 16-character code (spaces are automatically stripped)
5. [Official Google Support Guide](https://support.google.com/accounts/answer/185833)

### 2. 🚀 Brevo / Sendinblue (Recommended for High Volume • Free 300/day)
1. **Create Free Account:** [Brevo Sign Up](https://www.brevo.com) (no credit card required).
2. **Get SMTP Key:** Go directly to [Brevo SMTP Keys](https://app.brevo.com/settings/keys/smtp).
3. Click **Generate a new SMTP key** or copy Master Key.
4. In Certificate Studio:
   - **Host:** `smtp-relay.brevo.com`
   - **Port:** `587` (STARTTLS)
   - **Email / Username:** Your Brevo account email
   - **Password:** Your Brevo SMTP Key

### 3. ⚡ Resend (Developer Relay • Free 3,000/month)
1. **Create Account:** [Resend.com](https://resend.com)
2. **Create API Key:** [Resend API Keys Dashboard](https://resend.com/api-keys) with "Sending access".
3. In Certificate Studio:
   - **Host:** `smtp.resend.com`
   - **Port:** `465` (SSL)
   - **Email / Username:** `resend` (the literal string)
   - **Password:** Your `re_...` API key
4. [Resend SMTP Documentation](https://resend.com/docs/dashboard/emails/send-emails-with-smtp)

### 4. 📫 Microsoft Outlook / Office 365
1. **Personal Accounts (@outlook.com / @hotmail.com):** Turn on 2FA and generate an App Password at [Microsoft Account Security](https://account.live.com/proofs/manage/additional).
2. **Work / School M365:** Ensure admin has enabled "Authenticated SMTP" in [Microsoft 365 Admin Center](https://admin.microsoft.com).
3. In Certificate Studio:
   - **Host:** `smtp.office365.com`
   - **Port:** `587` (STARTTLS)
   - **Email / Username:** Your Outlook email
   - **Password:** Your App Password
4. [Microsoft POP/IMAP/SMTP Settings Guide](https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-for-outlook-com-d088b986-291d-42b8-9564-9c414e2aa040)

### 5. 📬 Yahoo Mail
1. **Account Security:** [Yahoo Account Security](https://login.yahoo.com/account/security)
2. Click **Generate app password**, name it `Certificate Studio`, and copy the password.
3. In Certificate Studio:
   - **Host:** `smtp.mail.yahoo.com`
   - **Port:** `465` (SSL)
   - **Email / Username:** Your `@yahoo.com` email
   - **Password:** Generated app password
4. [Yahoo App Passwords Guide](https://help.yahoo.com/kb/SLN15241.html)

### 6. 📨 SendGrid (Twilio • Free 100/day)
1. **Create API Key:** [SendGrid API Keys Dashboard](https://app.sendgrid.com/settings/api_keys)
2. Set permission to **Mail Send** or **Full Access**.
3. In Certificate Studio:
   - **Host:** `smtp.sendgrid.com`
   - **Port:** `587` (STARTTLS)
   - **Email / Username:** `apikey` (literal string)
   - **Password:** Your `SG...` API key

