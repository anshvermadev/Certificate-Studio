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
