'use client';

import React, { useState, useEffect } from 'react';
import { SmtpConfig, EmailTemplate, Recipient } from '@/types';
import ClayDropdown from './ClayDropdown';
import Tooltip from './Tooltip';
import { formatDateDDMMYYYY, getTodayDDMMYYYY, toHtmlDateInputValue } from '@/lib/date';
import {
  FiSettings,
  FiMail,
  FiUser,
  FiCalendar,
  FiPlus,
  FiInfo,
  FiHash,
  FiEdit2,
  FiCheck,
  FiSliders,
  FiExternalLink,
  FiHelpCircle,
  FiBookOpen,
  FiKey,
  FiChevronDown,
  FiChevronUp,
  FiShield,
  FiZap,
  FiCheckCircle,
  FiAlertTriangle,
  FiSend
} from 'react-icons/fi';
import { TbFlask } from 'react-icons/tb';

// ==================== SMTP SETTINGS MODAL ====================
interface SmtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  smtpConfig: SmtpConfig;
  onSave: (config: SmtpConfig) => void;
  onLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export function SmtpModal({ isOpen, onClose, smtpConfig, onSave, onLog }: SmtpModalProps) {
  const detectPreset = (cfg: SmtpConfig): string => {
    if (cfg.mockMode) return 'simulation';
    const host = (cfg.host || '').toLowerCase();
    if (host.includes('gmail.com')) return 'gmail';
    if (host.includes('brevo.com') || host.includes('sendinblue')) return 'brevo';
    if (host.includes('resend.com')) return 'resend';
    if (host.includes('office365.com') || host.includes('outlook.com')) return 'outlook';
    if (host.includes('yahoo.com')) return 'yahoo';
    if (host.includes('sendgrid.com')) return 'sendgrid';
    return 'custom';
  };

  const [form, setForm] = useState<SmtpConfig>(smtpConfig);
  const [preset, setPreset] = useState<string>(detectPreset(smtpConfig));
  const [testEmail, setTestEmail] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [showAllGuides, setShowAllGuides] = useState<boolean>(false);

  useEffect(() => {
    setForm(smtpConfig);
    setPreset(detectPreset(smtpConfig));
  }, [smtpConfig, isOpen]);

  if (!isOpen) return null;

  const handlePresetChange = (val: string) => {
    setPreset(val);
    if (val === 'simulation') {
      setForm(prev => ({ ...prev, mockMode: true }));
    } else if (val === 'gmail') {
      setForm(prev => ({
        ...prev,
        mockMode: false,
        host: 'smtp.gmail.com',
        port: 465,
        secure: true
      }));
    } else if (val === 'brevo') {
      setForm(prev => ({
        ...prev,
        mockMode: false,
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false
      }));
    } else if (val === 'resend') {
      setForm(prev => ({
        ...prev,
        mockMode: false,
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        user: prev.user && prev.user !== 'apikey' ? prev.user : 'resend'
      }));
    } else if (val === 'outlook') {
      setForm(prev => ({
        ...prev,
        mockMode: false,
        host: 'smtp.office365.com',
        port: 587,
        secure: false
      }));
    } else if (val === 'yahoo') {
      setForm(prev => ({
        ...prev,
        mockMode: false,
        host: 'smtp.mail.yahoo.com',
        port: 465,
        secure: true
      }));
    } else if (val === 'sendgrid') {
      setForm(prev => ({
        ...prev,
        mockMode: false,
        host: 'smtp.sendgrid.com',
        port: 587,
        secure: false,
        user: 'apikey'
      }));
    } else if (val === 'custom') {
      setForm(prev => ({
        ...prev,
        mockMode: false
      }));
    }
  };

  const cleanPassword = (raw: string, isGmail: boolean) => {
    if (!raw) return '';
    return isGmail ? raw.replace(/\s+/g, '') : raw.trim();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const cleanedPass = cleanPassword(form.pass, preset === 'gmail');
      const payload = {
        ...form,
        pass: cleanedPass,
        user: form.user.trim(),
        host: form.host.trim(),
        mockMode: preset === 'simulation',
        testEmail: testEmail.trim()
      };

      const res = await fetch('/api/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        onLog(data.message, 'success');
      } else {
        alert('SMTP Test Failed: ' + data.error);
        onLog('SMTP Test Failed: ' + data.error, 'error');
      }
    } catch (err: any) {
      alert('Connection error: ' + err.message);
      onLog('Connection error: ' + err.message, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const cleanedPass = cleanPassword(form.pass, preset === 'gmail');
    onSave({
      ...form,
      pass: cleanedPass,
      user: form.user.trim(),
      host: form.host.trim(),
      mockMode: preset === 'simulation'
    });
    onClose();
  };

  const hasSpacesInPass = form.pass && /\s/.test(form.pass);

  return (
    <div id="smtpModal" className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#FAFAF8] rounded-[24px] shadow-[10px_10px_32px_rgba(0,0,0,0.25),-6px_-6px_20px_rgba(255,255,255,0.95)] max-w-2xl w-full overflow-hidden border border-[#E0DEDA] max-h-[92vh] flex flex-col">
        {/* Bold Red Window Header Strip with 3 Decorative Dots */}
        <div className="bg-[#D72638] px-5 sm:px-6 py-3.5 flex items-center justify-between shadow-[0_4px_10px_rgba(215,38,56,0.3)]">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white/60 shadow-inner"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-white/60 shadow-inner"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-white/60 shadow-inner"></span>
            </div>
            <div className="flex items-center space-x-2 text-white ml-2">
              <FiSettings className="text-lg text-white" />
              <h3 className="font-bold text-sm sm:text-base leading-tight tracking-wide">Email & SMTP Setup Guide</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/15 hover:bg-black/25 text-white flex items-center justify-center text-lg font-bold transition"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Presets Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#1A1A1A]">Select Your Email Provider:</label>
              <button
                type="button"
                onClick={() => setShowAllGuides(!showAllGuides)}
                className="text-[11px] font-bold text-[#D72638] hover:underline flex items-center gap-1"
              >
                <FiBookOpen className="w-3 h-3" />
                <span>{showAllGuides ? 'Hide All Guides' : 'Browse All Provider Guides & URLs'}</span>
                {showAllGuides ? <FiChevronUp className="w-3 h-3" /> : <FiChevronDown className="w-3 h-3" />}
              </button>
            </div>
            <ClayDropdown
              id="smtpPresetSelect"
              value={preset}
              onChange={val => handlePresetChange(val)}
              options={[
                { value: 'simulation', label: '🧪 Simulation / Mock Mode (Test safely without real credentials)' },
                { value: 'gmail', label: '✉️ Gmail / Google Workspace (16-char App Password)' },
                { value: 'brevo', label: '🚀 Brevo / Sendinblue (Recommended • Free 300 emails/day)' },
                { value: 'resend', label: '⚡ Resend (Developer Relay • Free 3,000/month)' },
                { value: 'outlook', label: '📫 Outlook / Microsoft 365 (Port 587)' },
                { value: 'yahoo', label: '📬 Yahoo Mail (App Password)' },
                { value: 'sendgrid', label: '📨 SendGrid (Twilio • Free 100/day)' },
                { value: 'custom', label: '⚙️ Custom SMTP Server' }
              ]}
            />
          </div>

          {/* ========================================================= */}
          {/* DYNAMIC SETUP GUIDE WITH DIRECT LINKS FOR ACTIVE PRESET  */}
          {/* ========================================================= */}

          {preset === 'simulation' && (
            <div className="p-3.5 clay-inset bg-[#F6F5F2] border border-[#E0DEDA] rounded-xl space-y-1.5 text-xs text-[#1A1A1A]">
              <div className="flex items-center gap-2 font-bold text-[#1A1A1A]">
                <TbFlask className="w-4 h-4 text-[#D72638]" />
                <span>Simulation / Mock Mode Active</span>
              </div>
              <p className="text-[11px] text-[#555555] leading-relaxed">
                No external SMTP server or email password required. Certificates and PDFs are generated normally, and dispatch is logged in real-time in the terminal with realistic timing. Great for testing layouts and bulk queuing safely before sending live emails.
              </p>
            </div>
          )}

          {preset === 'gmail' && (
            <div id="gmailGuideBox" className="p-3.5 clay-inset bg-[#FFFDF9] border border-[#F2DEB0] rounded-xl space-y-2.5 text-xs text-[#1A1A1A]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-[#B45309]">
                  <FiKey className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Gmail Step-by-Step Setup Guide</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded-full border border-[#FDE68A]">
                  App Password Required
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-[#444444] leading-relaxed">
                <p>
                  <b>1. Turn ON 2-Step Verification:</b> Google requires 2-Step Verification before enabling app passwords.
                </p>
                <div className="pl-4">
                  <a
                    href="https://myaccount.google.com/signinoptions/two-step-verification"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#D72638] hover:underline"
                  >
                    <span>Open Google 2-Step Verification</span>
                    <FiExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p>
                  <b>2. Generate a 16-character App Password:</b>
                </p>
                <div className="pl-4 space-y-1">
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#15803D] bg-green-50 px-2 py-0.5 rounded border border-green-200 hover:bg-green-100"
                  >
                    <FiKey className="w-3 h-3" />
                    <span>Generate Google App Password Here</span>
                    <FiExternalLink className="w-3 h-3" />
                  </a>
                  <p className="text-[10px] text-[#666666]">
                    Enter app name (e.g. <i>Certificate Studio</i>) &rarr; click <b>Create</b> &rarr; copy the yellow 16-letter code.
                  </p>
                </div>

                <p>
                  <b>3. Enter Credentials Below:</b> In <b>Email / Username</b>, enter your full Gmail address (e.g. <code>you@gmail.com</code>). In <b>Password</b>, paste the 16-character app password.
                </p>
              </div>

              <div className="pt-1.5 border-t border-[#F2DEB0] flex items-center justify-between text-[10px] text-[#78350F]">
                <span className="flex items-center gap-1">
                  <FiAlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                  <span>Your normal account login password will be rejected by Google SMTP.</span>
                </span>
                <a
                  href="https://support.google.com/accounts/answer/185833"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold hover:underline flex items-center gap-0.5 text-[#B45309]"
                >
                  <span>Help Doc</span>
                  <FiExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          )}

          {preset === 'brevo' && (
            <div id="brevoGuideBox" className="p-3.5 clay-inset bg-[#F0FDF4] border border-[#BBF0C5] rounded-xl space-y-2.5 text-xs text-[#1A1A1A]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-[#15803D]">
                  <FiZap className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
                  <span>Brevo (Sendinblue) Setup Guide (Recommended for Bulk)</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-[#DCFCE7] text-[#166534] px-2 py-0.5 rounded-full border border-[#86EFAC]">
                  Free 300 Emails/Day
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-[#333333] leading-relaxed">
                <p>
                  <b>1. Create a Free Brevo Account (if you don&apos;t have one):</b>
                </p>
                <div className="pl-4">
                  <a
                    href="https://www.brevo.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#15803D] hover:underline"
                  >
                    <span>Visit Brevo.com (Free Sign Up)</span>
                    <FiExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p>
                  <b>2. Copy Your SMTP Key:</b> Go directly to your Brevo SMTP Keys dashboard.
                </p>
                <div className="pl-4 space-y-1">
                  <a
                    href="https://app.brevo.com/settings/keys/smtp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#15803D] bg-white px-2 py-0.5 rounded border border-green-300 hover:bg-green-50"
                  >
                    <FiKey className="w-3 h-3" />
                    <span>Open Brevo SMTP Credentials Page</span>
                    <FiExternalLink className="w-3 h-3" />
                  </a>
                  <p className="text-[10px] text-[#666666]">
                    Click <b>Generate a new SMTP key</b> or copy your <b>Master SMTP Key</b>.
                  </p>
                </div>

                <p>
                  <b>3. Paste into the fields below:</b> In <b>Email / Username</b>, enter your Brevo account email. In <b>Password</b>, paste your Brevo SMTP Key.
                </p>
              </div>

              <div className="pt-1.5 border-t border-[#BBF0C5] text-[10px] text-[#166534]">
                <span>Pre-configured: Host <code>smtp-relay.brevo.com</code> &bull; Port <code>587</code> &bull; STARTTLS.</span>
              </div>
            </div>
          )}

          {preset === 'resend' && (
            <div id="resendGuideBox" className="p-3.5 clay-inset bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl space-y-2.5 text-xs text-[#1A1A1A]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-[#0F172A]">
                  <FiZap className="w-3.5 h-3.5 text-blue-600" />
                  <span>Resend Developer Relay Setup Guide</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                  Free 3,000 Emails/Mo
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-[#334155] leading-relaxed">
                <p>
                  <b>1. Create an API Key in Resend:</b>
                </p>
                <div className="pl-4 space-y-1">
                  <a
                    href="https://resend.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline"
                  >
                    <span>Open Resend API Keys Dashboard</span>
                    <FiExternalLink className="w-3 h-3" />
                  </a>
                  <p className="text-[10px] text-[#64748B]">
                    Click <b>Create API Key</b> with &quot;Sending access&quot; permission and copy the <code>re_...</code> key.
                  </p>
                </div>

                <p>
                  <b>2. Fill in the credentials below:</b>
                </p>
                <ul className="list-disc pl-5 text-[10px] space-y-0.5 text-[#475569]">
                  <li><b>Email / Username:</b> <code>resend</code> (the exact word &quot;resend&quot;)</li>
                  <li><b>Password:</b> Your Resend API Key (starts with <code>re_</code>)</li>
                  <li><b>Host &amp; Port:</b> Preconfigured to <code>smtp.resend.com:465</code> (SSL)</li>
                </ul>
              </div>

              <div className="pt-1.5 border-t border-[#CBD5E1] flex items-center justify-between text-[10px] text-[#475569]">
                <span>Requires a verified sending domain in Resend for external recipients.</span>
                <a
                  href="https://resend.com/docs/dashboard/emails/send-emails-with-smtp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-blue-700 hover:underline flex items-center gap-0.5"
                >
                  <span>Resend SMTP Docs</span>
                  <FiExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          )}

          {preset === 'outlook' && (
            <div id="outlookGuideBox" className="p-3.5 clay-inset bg-[#F0F9FF] border border-[#BAE6FD] rounded-xl space-y-2.5 text-xs text-[#1A1A1A]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-[#0369A1]">
                  <FiMail className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Microsoft Outlook / Office 365 Setup Guide</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-[#E0F2FE] text-[#075985] px-2 py-0.5 rounded-full border border-[#BAE6FD]">
                  Port 587 STARTTLS
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-[#334155] leading-relaxed">
                <p>
                  <b>For Personal Accounts (@outlook.com / @hotmail.com):</b>
                </p>
                <div className="pl-4 space-y-1">
                  <a
                    href="https://account.live.com/proofs/manage/additional"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#0284C7] hover:underline"
                  >
                    <span>Open Microsoft Security &amp; App Passwords</span>
                    <FiExternalLink className="w-3 h-3" />
                  </a>
                  <p className="text-[10px] text-[#64748B]">
                    Enable Two-Step Verification, scroll down to <b>App passwords</b>, click <b>Create a new app password</b>, and paste it below.
                  </p>
                </div>

                <p>
                  <b>For School / Work Microsoft 365 Accounts:</b>
                </p>
                <div className="pl-4 space-y-1">
                  <p className="text-[10px] text-[#64748B]">
                    Your IT admin must enable <b>Authenticated SMTP</b> in the Microsoft 365 Admin Center under <i>Active Users &gt; Mail &gt; Manage email apps &gt; Authenticated SMTP</i>.
                  </p>
                  <a
                    href="https://admin.microsoft.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0284C7] hover:underline"
                  >
                    <span>Microsoft 365 Admin Center</span>
                    <FiExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              <div className="pt-1.5 border-t border-[#BAE6FD] text-[10px] text-[#075985]">
                <a
                  href="https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-for-outlook-com-d088b986-291d-42b8-9564-9c414e2aa040"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold hover:underline flex items-center gap-0.5"
                >
                  <span>Read Official Microsoft POP/IMAP/SMTP Settings Guide</span>
                  <FiExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          )}

          {preset === 'yahoo' && (
            <div id="yahooGuideBox" className="p-3.5 clay-inset bg-[#FAF5FF] border border-[#E9D5FF] rounded-xl space-y-2.5 text-xs text-[#1A1A1A]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-[#7E22CE]">
                  <FiKey className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Yahoo Mail Setup Guide</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-[#F3E8FF] text-[#6B21A8] px-2 py-0.5 rounded-full border border-[#D8B4FE]">
                  App Password Required
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-[#4C1D95] leading-relaxed">
                <p>
                  <b>1. Open Yahoo Account Security:</b>
                </p>
                <div className="pl-4">
                  <a
                    href="https://login.yahoo.com/account/security"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#7E22CE] hover:underline"
                  >
                    <span>Open Yahoo Account Security Settings</span>
                    <FiExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p>
                  <b>2. Generate an App Password:</b> Scroll to <b>Generate app password</b> &rarr; enter <code>Certificate Studio</code> &rarr; click <b>Generate</b> &rarr; copy the password and paste it into the Password field below.
                </p>
              </div>

              <div className="pt-1.5 border-t border-[#E9D5FF] text-[10px] text-[#6B21A8]">
                <a
                  href="https://help.yahoo.com/kb/SLN15241.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold hover:underline flex items-center gap-0.5"
                >
                  <span>Official Yahoo App Password Documentation</span>
                  <FiExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          )}

          {preset === 'sendgrid' && (
            <div id="sendgridGuideBox" className="p-3.5 clay-inset bg-[#F0FDF4] border border-[#BBF0C5] rounded-xl space-y-2.5 text-xs text-[#1A1A1A]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-[#15803D]">
                  <FiKey className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>SendGrid (Twilio) Setup Guide</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-[#DCFCE7] text-[#166534] px-2 py-0.5 rounded-full border border-[#86EFAC]">
                  Free 100/Day
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-[#333333] leading-relaxed">
                <p>
                  <b>1. Generate an API Key in SendGrid:</b>
                </p>
                <div className="pl-4 space-y-1">
                  <a
                    href="https://app.sendgrid.com/settings/api_keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#15803D] hover:underline"
                  >
                    <span>Open SendGrid API Keys Dashboard</span>
                    <FiExternalLink className="w-3 h-3" />
                  </a>
                  <p className="text-[10px] text-[#666666]">
                    Click <b>Create API Key</b> &rarr; select <b>Full Access</b> or <b>Mail Send</b> permission &rarr; copy the key starting with <code>SG.</code>
                  </p>
                </div>

                <p>
                  <b>2. Enter Credentials:</b>
                </p>
                <ul className="list-disc pl-5 text-[10px] space-y-0.5 text-[#555555]">
                  <li><b>Email / Username:</b> <code>apikey</code> (the exact string &quot;apikey&quot;)</li>
                  <li><b>Password:</b> Your SendGrid API Key (starts with <code>SG.</code>)</li>
                  <li><b>Host &amp; Port:</b> Preconfigured to <code>smtp.sendgrid.com:587</code></li>
                </ul>
              </div>
            </div>
          )}

          {preset === 'custom' && (
            <div id="customGuideBox" className="p-3.5 clay-inset bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-2 text-xs text-[#1A1A1A]">
              <div className="flex items-center gap-1.5 font-bold text-[#334155]">
                <FiSettings className="w-3.5 h-3.5" />
                <span>Custom SMTP Server Setup</span>
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                Enter the SMTP Host and credentials provided by your hosting provider, university server, or transactional provider. Standard ports are <b>465 (SSL)</b> or <b>587 (STARTTLS)</b>.
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-[10px]">
                <a
                  href="https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 bg-white border border-[#CBD5E1] rounded text-[#0F172A] font-bold hover:bg-slate-50 inline-flex items-center gap-1"
                >
                  <span>Amazon SES Guide</span>
                  <FiExternalLink className="w-2.5 h-2.5" />
                </a>
                <a
                  href="https://documentation.mailgun.com/docs/mailgun/user-manual/sending-messages/#sending-via-smtp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 bg-white border border-[#CBD5E1] rounded text-[#0F172A] font-bold hover:bg-slate-50 inline-flex items-center gap-1"
                >
                  <span>Mailgun Guide</span>
                  <FiExternalLink className="w-2.5 h-2.5" />
                </a>
                <a
                  href="https://postmarkapp.com/developer/user-guide/send-email-with-smtp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 bg-white border border-[#CBD5E1] rounded text-[#0F172A] font-bold hover:bg-slate-50 inline-flex items-center gap-1"
                >
                  <span>Postmark Guide</span>
                  <FiExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* EXPANDABLE DIRECTORY OF ALL PROVIDER URLS & DAILY LIMITS  */}
          {/* ========================================================= */}
          {showAllGuides && (
            <div className="p-3.5 rounded-xl border border-[#D72638]/30 bg-[#FEF2F2] space-y-3 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#FCA5A5]">
                <span className="font-bold text-[#991B1B] flex items-center gap-1.5">
                  <FiBookOpen className="w-4 h-4 text-[#D72638]" />
                  <span>All Email Providers Quick-Reference &amp; URLs</span>
                </span>
                <span className="text-[10px] text-[#7F1D1D] font-mono">Direct Links Directory</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-white rounded-lg border border-[#FCA5A5]/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1A1A1A]">Gmail (Google)</span>
                    <span className="text-[9px] font-mono bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200">500 / day</span>
                  </div>
                  <p className="text-[10px] text-[#666666]">Host: smtp.gmail.com:465 (SSL)</p>
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-[#D72638] hover:underline flex items-center gap-1"
                  >
                    <span>Get Google App Password</span>
                    <FiExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="p-2 bg-white rounded-lg border border-green-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1A1A1A]">Brevo (Sendinblue)</span>
                    <span className="text-[9px] font-mono bg-green-50 text-green-800 px-1.5 py-0.2 rounded border border-green-200">Free 300 / day</span>
                  </div>
                  <p className="text-[10px] text-[#666666]">Host: smtp-relay.brevo.com:587</p>
                  <a
                    href="https://app.brevo.com/settings/keys/smtp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-green-700 hover:underline flex items-center gap-1"
                  >
                    <span>Get Brevo SMTP Key</span>
                    <FiExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="p-2 bg-white rounded-lg border border-blue-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1A1A1A]">Resend</span>
                    <span className="text-[9px] font-mono bg-blue-50 text-blue-800 px-1.5 py-0.2 rounded border border-blue-200">Free 3,000 / mo</span>
                  </div>
                  <p className="text-[10px] text-[#666666]">Host: smtp.resend.com:465</p>
                  <a
                    href="https://resend.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-blue-700 hover:underline flex items-center gap-1"
                  >
                    <span>Get Resend API Key</span>
                    <FiExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="p-2 bg-white rounded-lg border border-sky-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1A1A1A]">Outlook / M365</span>
                    <span className="text-[9px] font-mono bg-sky-50 text-sky-800 px-1.5 py-0.2 rounded border border-sky-200">Standard</span>
                  </div>
                  <p className="text-[10px] text-[#666666]">Host: smtp.office365.com:587</p>
                  <a
                    href="https://account.live.com/proofs/manage/additional"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-sky-700 hover:underline flex items-center gap-1"
                  >
                    <span>Microsoft App Passwords</span>
                    <FiExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SMTP CREDENTIALS FORM INPUTS                              */}
          {/* ========================================================= */}
          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div className="col-span-2">
              <label className="block font-bold text-[#1A1A1A] mb-1">Sender Name (Display Name on Sent Emails)</label>
              <input
                type="text"
                id="smtpSenderName"
                value={form.senderName}
                placeholder="e.g. ACM Student Chapter or Acme Academy"
                onChange={e => setForm({ ...form, senderName: e.target.value })}
                className="w-full clay-inset p-2.5 font-medium"
              />
            </div>
            <div className="col-span-2">
              <label className="block font-bold text-[#1A1A1A] mb-1">SMTP Host</label>
              <input
                type="text"
                id="smtpHost"
                value={form.host}
                placeholder="smtp.gmail.com"
                onChange={e => setForm({ ...form, host: e.target.value })}
                className="w-full clay-inset p-2.5 font-medium font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">SMTP Port</label>
              <input
                type="number"
                id="smtpPort"
                value={form.port}
                placeholder="465 or 587"
                onChange={e => setForm({ ...form, port: Number(e.target.value) })}
                className="w-full clay-inset p-2.5 font-medium font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">SSL / TLS Protocol</label>
              <ClayDropdown
                id="smtpSecure"
                value={form.secure ? 'true' : 'false'}
                onChange={val => setForm({ ...form, secure: val === 'true' })}
                options={[
                  { value: 'true', label: 'SSL / TLS (Port 465)' },
                  { value: 'false', label: 'STARTTLS (Port 587)' }
                ]}
              />
            </div>
            <div className="col-span-2">
              <label className="block font-bold text-[#1A1A1A] mb-1">
                Email / Username <span className="font-normal text-[#666666]">(Your sending email or API user)</span>
              </label>
              <input
                type="email"
                id="smtpUser"
                value={form.user}
                placeholder={preset === 'resend' ? 'resend' : preset === 'sendgrid' ? 'apikey' : 'your-email@gmail.com'}
                onChange={e => setForm({ ...form, user: e.target.value })}
                className="w-full clay-inset p-2.5 font-medium"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-[#1A1A1A]">
                  Password / App Password / Key
                </label>
                {hasSpacesInPass && (
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, pass: prev.pass.replace(/\s+/g, '') }))}
                    className="text-[10px] font-bold text-[#D72638] bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded border border-red-200 transition"
                  >
                    Remove Spaces (Clean 16-char code)
                  </button>
                )}
              </div>
              <input
                type="password"
                id="smtpPass"
                value={form.pass}
                placeholder={preset === 'gmail' ? '16-character Google App Password' : '••••••••••••••••'}
                onChange={e => setForm({ ...form, pass: e.target.value })}
                className="w-full clay-inset p-2.5 font-medium font-mono"
              />
              {hasSpacesInPass && preset === 'gmail' && (
                <p className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                  <FiInfo className="w-3 h-3 flex-shrink-0" />
                  <span>Google App Passwords have spaces when copied. They will be auto-cleaned upon testing and saving.</span>
                </p>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* TEST CONNECTION SECTION                                  */}
          {/* ========================================================= */}
          <div className="pt-3 border-t border-[#E0DEDA] space-y-2">
            <label className="block text-[11px] font-bold text-[#1A1A1A]">
              Test Connection &amp; Send Handshake:
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="email"
                id="smtpTestRecipient"
                placeholder="Send a test certificate to (e.g. you@example.com)"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                className="flex-1 text-xs clay-inset p-2.5 font-medium"
              />
              <Tooltip content="Send an authentication handshake to verify server and port connectivity" position="top">
                <button
                  type="button"
                  id="btnTestSmtp"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-4 py-2.5 clay-btn-dark font-bold text-xs whitespace-nowrap flex items-center gap-1.5 shadow"
                >
                  <FiSend className="w-3 h-3" />
                  <span>{isTesting ? 'Verifying...' : 'Test Connection'}</span>
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-[#E0DEDA]">
            <span className="text-[10px] text-[#666666]">
              {preset === 'simulation' ? '🧪 Mock mode active' : `⚡ Provider: ${preset}`}
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                id="btnCancelSmtpModal"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-[#555555] hover:text-[#1A1A1A] transition"
              >
                Cancel
              </button>
              <Tooltip content="Apply and save SMTP configuration to event" position="top">
                <button
                  type="button"
                  id="btnSaveSmtpSettings"
                  onClick={handleSave}
                  className="px-5 py-2.5 clay-btn-primary font-bold text-xs shadow flex items-center gap-1.5"
                >
                  <FiCheck className="text-sm" />
                  <span>Save Configuration</span>
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== EMAIL TEMPLATE MODAL ====================
interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  emailTemplate: EmailTemplate;
  onSave: (template: EmailTemplate) => void;
}

export function EmailTemplateModal({ isOpen, onClose, emailTemplate, onSave }: TemplateModalProps) {
  const [subject, setSubject] = useState<string>(emailTemplate.subject);
  const [body, setBody] = useState<string>(emailTemplate.body);

  useEffect(() => {
    setSubject(emailTemplate.subject);
    setBody(emailTemplate.body);
  }, [emailTemplate, isOpen]);

  if (!isOpen) return null;

  return (
    <div id="emailTemplateModal" className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#FAFAF8] rounded-[24px] shadow-[10px_10px_32px_rgba(0,0,0,0.25),-6px_-6px_20px_rgba(255,255,255,0.95)] max-w-xl w-full overflow-hidden border border-[#E0DEDA] flex flex-col">
        {/* Bold Red Window Header Strip with 3 Decorative Dots */}
        <div className="bg-[#D72638] px-6 py-4 flex items-center justify-between shadow-[0_4px_10px_rgba(215,38,56,0.3)]">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white/60 shadow-inner"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-white/60 shadow-inner"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-white/60 shadow-inner"></span>
            </div>
            <div className="flex items-center space-x-2 text-white ml-2">
              <FiMail className="text-lg text-white" />
              <h3 className="font-bold text-base leading-tight tracking-wide">Customize Email Message</h3>
            </div>
          </div>
          <button
            type="button"
            id="btnCloseTemplateModal"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/15 hover:bg-black/25 text-white flex items-center justify-center text-lg font-bold transition"
          >
            &times;
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#1A1A1A] mb-1.5">Email Subject Line</label>
            <input
              type="text"
              id="inputEmailSubject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full clay-inset p-3 font-semibold"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-bold text-[#1A1A1A]">Email Message Body</label>
              <span className="text-[11px] text-[#777777]">
                Empty lines &amp; breaks preserved 1:1. Placeholders: <code>{'{name}'}</code>, <code>{'{date}'}</code>, <code>{'{id}'}</code>
              </span>
            </div>
            <textarea
              id="inputEmailBody"
              rows={7}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Dear {name},&#10;&#10;Congratulations! Please find attached your verified certificate.&#10;&#10;Certificate ID: {id}&#10;Issue Date: {date}"
              className="w-full clay-inset p-3 font-mono text-xs leading-relaxed"
            />
          </div>

          {/* Live Delivery Preview */}
          <div className="rounded-xl border border-[#E0DEDA] bg-[#FAF9F5] p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#555555]">
              <span>Delivery Appearance Preview (Recipient Inbox)</span>
              <span className="text-[10px] text-[#888888] font-normal">Clean standard text formatting</span>
            </div>
            <div className="bg-white rounded-lg p-3 border border-[#EBE8E2] space-y-2 text-[#111111] font-sans text-xs shadow-inner">
              <div className="text-[11px] text-[#666666] pb-1.5 border-b border-[#F0EEEA]">
                <span className="font-bold text-[#333333]">Subject: </span>
                {subject
                  .replace(/\{name\}|\{\{name\}\}/gi, 'Alex Johnson')
                  .replace(/\{id\}|\{\{id\}\}/gi, 'CERT-2026-001')
                  .replace(/\{date\}|\{\{date\}\}/gi, '04/09/2026') || '(No Subject)'}
              </div>
              <div className="space-y-3 pt-1">
                {(body || '')
                  .replace(/\{name\}|\{\{name\}\}/gi, 'Alex Johnson')
                  .replace(/\{id\}|\{\{id\}\}/gi, 'CERT-2026-001')
                  .replace(/\{date\}|\{\{date\}\}/gi, '04/09/2026')
                  .replace(/\r\n/g, '\n')
                  .split(/\n\s*\n/)
                  .filter((p, idx, arr) => !(p.trim() === '' && (idx === 0 || idx === arr.length - 1)))
                  .map((para, idx) => (
                    <p key={idx} className="m-0 leading-relaxed">
                      {para.trim() === '' ? (
                        <>&nbsp;</>
                      ) : (
                        para.split('\n').map((line, lineIdx, lines) => (
                          <React.Fragment key={lineIdx}>
                            {line}
                            {lineIdx < lines.length - 1 && <br />}
                          </React.Fragment>
                        ))
                      )}
                    </p>
                  ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E0DEDA]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#555555] hover:text-[#1A1A1A] transition"
            >
              Cancel
            </button>
            <Tooltip content="Save customized subject and email body" position="top">
              <button
                type="button"
                id="btnSaveEmailTemplate"
                onClick={() => {
                  onSave({ subject, body });
                  onClose();
                }}
                className="px-5 py-2.5 clay-btn-primary font-bold text-xs shadow"
              >
                Save Template
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== ADD RECIPIENT MODAL ====================
interface AddRecipientModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextId: number;
  prefix?: string;
  onAdd: (recipient: Recipient) => void;
}

export function AddRecipientModal({ isOpen, onClose, nextId, prefix = 'CERT-', onAdd }: AddRecipientModalProps) {
  const [isSplit, setIsSplit] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [certId, setCertId] = useState<string>(`${prefix}${String(nextId).padStart(4, '0')}`);
  const [date, setDate] = useState<string>(getTodayDDMMYYYY());
  const [dateInputVal, setDateInputVal] = useState<string>(toHtmlDateInputValue());
  const [course, setCourse] = useState<string>('');

  useEffect(() => {
    setCertId(`${prefix}${String(nextId).padStart(4, '0')}`);
    setFullName('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setIsSplit(false);
    setDate(getTodayDDMMYYYY());
    setDateInputVal(toHtmlDateInputValue());
  }, [nextId, prefix, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    let resolved = '';
    if (isSplit) {
      if (!firstName.trim() && !lastName.trim()) {
        alert('Please enter at least First Name or Last Name.');
        return;
      }
      resolved = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
    } else {
      resolved = fullName.trim();
      if (!resolved) {
        alert('Please enter recipient Full Name.');
        return;
      }
    }

    if (!email.trim() || !email.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }

    onAdd({
      id: nextId,
      name: resolved,
      email: email.trim(),
      certId: certId.trim() || `CERT-${String(nextId).padStart(4, '0')}`,
      date: date.trim(),
      course: course.trim(),
      status: 'Ready'
    });

    onClose();
  };

  return (
    <div id="addRecipientModal" className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#FAFAF8] rounded-[24px] shadow-[10px_10px_32px_rgba(0,0,0,0.25),-6px_-6px_20px_rgba(255,255,255,0.95)] max-w-md w-full overflow-hidden border border-[#E0DEDA] flex flex-col">
        {/* Bold Red Window Header Strip with 3 Decorative Dots */}
        <div className="bg-[#D72638] px-6 py-4 flex items-center justify-between shadow-[0_4px_10px_rgba(215,38,56,0.3)]">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white/60 shadow-inner"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-white/60 shadow-inner"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-white/60 shadow-inner"></span>
            </div>
            <div className="flex items-center space-x-2 text-white ml-2">
              <FiUser className="text-lg text-white" />
              <h3 className="font-bold text-base leading-tight tracking-wide">Add Member / Recipient</h3>
            </div>
          </div>
          <button
            type="button"
            id="btnCloseAddRecipientModal"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/15 hover:bg-black/25 text-white flex items-center justify-center text-lg font-bold transition"
          >
            &times;
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Name Format Toggle */}
          <div className="flex items-center space-x-4 clay-inset p-2.5">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="addNameFormat"
                id="radioNameFull"
                value="full"
                checked={!isSplit}
                onChange={() => setIsSplit(false)}
                className="accent-[#D72638]"
              />
              <span className="font-bold text-[#1A1A1A]">Full Name</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="addNameFormat"
                id="radioNameSplit"
                value="split"
                checked={isSplit}
                onChange={() => setIsSplit(true)}
                className="accent-[#D72638]"
              />
              <span className="font-bold text-[#1A1A1A]">First + Last Name</span>
            </label>
          </div>

          {/* Full Name Input */}
          {!isSplit ? (
            <div id="addFullNameContainer">
              <label className="block font-bold text-[#1A1A1A] mb-1">
                Full Name <span className="text-[#D72638]">*</span>
              </label>
              <input
                type="text"
                id="inputAddFullName"
                placeholder="e.g. Johnathan Vance"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full clay-inset p-2.5 font-semibold"
              />
            </div>
          ) : (
            /* Split Name Inputs */
            <div id="addSplitNameContainer" className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#1A1A1A] mb-1">
                  First Name <span className="text-[#D72638]">*</span>
                </label>
                <input
                  type="text"
                  id="inputAddFirstName"
                  placeholder="Johnathan"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full clay-inset p-2.5 font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-[#1A1A1A] mb-1">
                  Last Name <span className="text-[#D72638]">*</span>
                </label>
                <input
                  type="text"
                  id="inputAddLastName"
                  placeholder="Vance"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full clay-inset p-2.5 font-semibold"
                />
              </div>
            </div>
          )}

          {/* Email Address */}
          <div>
            <label className="block font-bold text-[#1A1A1A] mb-1">
              Email Address <span className="text-[#D72638]">*</span>
            </label>
            <input
              type="email"
              id="inputAddEmail"
              placeholder="johnathan.vance@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full clay-inset p-2.5 font-semibold"
            />
          </div>

          {/* Certificate ID & Date Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">Certificate ID</label>
              <input
                type="text"
                id="inputAddCertId"
                placeholder="CERT-2026-0001"
                value={certId}
                onChange={e => setCertId(e.target.value)}
                className="w-full clay-inset p-2.5 font-mono"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-[#1A1A1A] text-xs">Issue Date</label>
                <span className="text-[10px] font-mono font-bold text-[#D72638] bg-[#FDECEF] px-1.5 py-0.5 rounded border border-[#F8B4BD]">
                  dd/mm/yyyy
                </span>
              </div>
              <input
                type="date"
                id="inputAddDate"
                value={dateInputVal}
                onChange={e => {
                  const val = e.target.value;
                  setDateInputVal(val);
                  setDate(formatDateDDMMYYYY(val));
                }}
                className="w-full clay-inset p-2.5 font-medium text-xs text-[#1A1A1A] cursor-pointer"
              />
              <div className="flex items-center justify-between mt-1 text-[11px] text-[#777777]">
                <span>Formatted: <strong className="text-[#1A1A1A] font-mono">{date}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = getTodayDDMMYYYY();
                    setDate(todayStr);
                    setDateInputVal(toHtmlDateInputValue(todayStr));
                  }}
                  className="text-[#D72638] font-bold hover:underline text-[10px] inline-flex items-center gap-1"
                >
                  <FiCalendar className="w-3 h-3" />
                  <span>Today</span>
                </button>
              </div>
            </div>
          </div>

          {/* Course / Event (Optional) */}
          <div>
            <label className="block font-bold text-[#1A1A1A] mb-1">Course / Program (Optional)</label>
            <input
              type="text"
              id="inputAddCourse"
              placeholder="e.g. Advanced AI Program"
              value={course}
              onChange={e => setCourse(e.target.value)}
              className="w-full clay-inset p-2.5 font-medium"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E0DEDA]">
            <button
              type="button"
              id="btnCancelAddRecipient"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#555555] hover:text-[#1A1A1A] transition"
            >
              Cancel
            </button>
            <Tooltip content="Insert member into recipients table" position="top">
              <button
                type="button"
                id="btnSaveNewRecipient"
                onClick={handleSubmit}
                className="px-5 py-2.5 clay-btn-primary font-bold text-xs shadow flex items-center space-x-1.5"
              >
                <FiPlus className="text-sm" />
                <span>Add Member</span>
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== EDIT RECIPIENT MODAL ====================
interface EditRecipientModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: Recipient | null;
  onSave: (updated: Recipient) => void;
}

export function EditRecipientModal({ isOpen, onClose, recipient, onSave }: EditRecipientModalProps) {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [certId, setCertId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [course, setCourse] = useState<string>('');

  useEffect(() => {
    if (recipient) {
      setName(recipient.name || '');
      setEmail(recipient.email || '');
      setCertId(recipient.certId || '');
      setDate(recipient.date || getTodayDDMMYYYY());
      setCourse(recipient.course || '');
    }
  }, [recipient, isOpen]);

  if (!isOpen || !recipient) return null;

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter recipient name.');
      return;
    }
    onSave({
      ...recipient,
      name: name.trim(),
      email: email.trim(),
      certId: certId.trim(),
      date: date.trim(),
      course: course.trim()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="clay-modal max-w-md w-full overflow-hidden">
        <div className="clay-modal-header p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-white">
            <FiEdit2 className="text-base" />
            <h3 className="font-bold text-sm">Edit Recipient Details</h3>
          </div>
          <button type="button" onClick={onClose} className="text-white hover:opacity-80 text-xl font-bold leading-none">
            &times;
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#1A1A1A] mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full clay-inset p-2.5 font-bold text-[#1A1A1A]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#1A1A1A] mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full clay-inset p-2.5 font-medium text-[#1A1A1A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">Certificate ID</label>
              <input
                type="text"
                value={certId}
                onChange={e => setCertId(e.target.value)}
                className="w-full clay-inset p-2.5 font-mono font-bold text-[#1A1A1A]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">Issue Date</label>
              <input
                type="text"
                value={date}
                onChange={e => setDate(e.target.value)}
                placeholder="dd/mm/yyyy"
                className="w-full clay-inset p-2.5 font-mono font-medium text-[#1A1A1A]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#1A1A1A] mb-1">Course / Program (Optional)</label>
            <input
              type="text"
              value={course}
              onChange={e => setCourse(e.target.value)}
              className="w-full clay-inset p-2.5 font-medium text-[#1A1A1A]"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E0DEDA]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#555555] hover:text-[#1A1A1A] transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 clay-btn-primary font-bold text-xs shadow flex items-center space-x-1.5"
            >
              <FiCheck className="text-sm" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== FORMAT CERTIFICATE ID & PREFIX MODAL ====================
interface FormatCertIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrefix: string;
  recipients: Recipient[];
  onApply: (newPrefix: string, updatedRecipients: Recipient[]) => void;
}

export function FormatCertIdModal({
  isOpen,
  onClose,
  currentPrefix,
  recipients,
  onApply
}: FormatCertIdModalProps) {
  const [prefix, setPrefix] = useState<string>(currentPrefix || 'CERT-');
  const [strategy, setStrategy] = useState<'format_existing' | 'sequential'>('format_existing');
  const [startNum, setStartNum] = useState<number>(1);
  const [padDigits, setPadDigits] = useState<number>(4);

  useEffect(() => {
    setPrefix(currentPrefix || 'CERT-');
  }, [currentPrefix, isOpen]);

  if (!isOpen) return null;

  const computeId = (r: Recipient, idx: number): string => {
    if (strategy === 'sequential') {
      const num = startNum + idx;
      return `${prefix}${String(num).padStart(padDigits, '0')}`;
    } else {
      const existing = String(r.certId || '').trim();
      const match = existing.match(/\d+/);
      const numStr = match ? match[0] : String(idx + 1);
      return `${prefix}${numStr.padStart(padDigits, '0')}`;
    }
  };

  const handleApply = () => {
    const updated = recipients.map((r, idx) => ({
      ...r,
      certId: computeId(r, idx)
    }));
    onApply(prefix, updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="clay-modal max-w-lg w-full overflow-hidden">
        <div className="clay-modal-header p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-white">
            <FiHash className="text-base" />
            <h3 className="font-bold text-sm">Certificate ID Format &amp; Prefix</h3>
          </div>
          <button type="button" onClick={onClose} className="text-white hover:opacity-80 text-xl font-bold leading-none">
            &times;
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Prefix Input */}
          <div>
            <label className="block font-bold text-[#1A1A1A] mb-1">
              Certificate ID Prefix
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                id="inputCertIdPrefix"
                value={prefix}
                onChange={e => setPrefix(e.target.value)}
                placeholder="e.g. CERT- or HWI- or EVENT-"
                className="w-full clay-inset p-2.5 font-mono font-bold text-sm text-[#1A1A1A]"
              />
              <button
                type="button"
                onClick={() => setPrefix('CERT-')}
                className="clay-btn-secondary px-3 py-2 text-xs font-bold whitespace-nowrap"
              >
                Reset CERT-
              </button>
            </div>
            <p className="text-[10px] text-[#777777] mt-1 font-medium">
              You can change this prefix to anything (e.g. <code>CERT-</code>, <code>HWI-</code>, <code>BC-2026-</code>).
            </p>
          </div>

          {/* Strategy Selection */}
          <div className="space-y-2">
            <label className="block font-bold text-[#1A1A1A]">Number Generation Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                onClick={() => setStrategy('format_existing')}
                className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  strategy === 'format_existing'
                    ? 'border-[#D72638] bg-[#FFF5F5] shadow-sm'
                    : 'border-[#E0DEDA] bg-white hover:border-[#CCCCCC]'
                }`}
              >
                <div className="font-bold text-xs text-[#1A1A1A] flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="idStrategy"
                    checked={strategy === 'format_existing'}
                    onChange={() => setStrategy('format_existing')}
                    className="text-[#D72638]"
                  />
                  <span>Format Spreadsheet Numbers</span>
                </div>
                <p className="text-[10px] text-[#666666] mt-1">
                  Takes raw numbers from your Excel column (e.g. <code>7</code> &rarr; <code>{prefix}0007</code>).
                </p>
              </label>

              <label
                onClick={() => setStrategy('sequential')}
                className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  strategy === 'sequential'
                    ? 'border-[#D72638] bg-[#FFF5F5] shadow-sm'
                    : 'border-[#E0DEDA] bg-white hover:border-[#CCCCCC]'
                }`}
              >
                <div className="font-bold text-xs text-[#1A1A1A] flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="idStrategy"
                    checked={strategy === 'sequential'}
                    onChange={() => setStrategy('sequential')}
                    className="text-[#D72638]"
                  />
                  <span>Fresh Sequential Numbers</span>
                </div>
                <p className="text-[10px] text-[#666666] mt-1">
                  Generates clean sequential IDs (e.g. <code>{prefix}0001</code>, <code>{prefix}0002</code>...).
                </p>
              </label>
            </div>
          </div>

          {/* Number formatting settings */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">Zero-Padding Digits</label>
              <select
                value={padDigits}
                onChange={e => setPadDigits(Number(e.target.value))}
                className="w-full clay-inset p-2 font-bold text-xs text-[#1A1A1A]"
              >
                <option value={4}>4 digits (e.g. 0001)</option>
                <option value={3}>3 digits (e.g. 001)</option>
                <option value={5}>5 digits (e.g. 00001)</option>
                <option value={0}>No padding (e.g. 1)</option>
              </select>
            </div>

            {strategy === 'sequential' && (
              <div>
                <label className="block font-bold text-[#1A1A1A] mb-1">Starting Number</label>
                <input
                  type="number"
                  min={1}
                  value={startNum}
                  onChange={e => setStartNum(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full clay-inset p-2 font-bold text-xs text-[#1A1A1A]"
                />
              </div>
            )}
          </div>

          {/* Live Preview Box */}
          <div className="rounded-xl border border-[#E0DEDA] bg-[#FAF9F5] p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#555555]">
              <span>Sample Preview ({Math.min(recipients.length, 4)} members)</span>
              <span className="text-[10px] text-[#D72638] font-mono font-bold">
                {strategy === 'format_existing' ? 'Prefixed & Padded' : 'Sequential'}
              </span>
            </div>
            <div className="space-y-1.5 font-mono text-[11px]">
              {recipients.slice(0, 4).map((r, idx) => (
                <div key={r.id || idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#EBE8E2]">
                  <span className="font-sans font-semibold text-[#1A1A1A] truncate max-w-[180px]">{r.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#888888] line-through text-[10px]">{r.certId || `Row ${idx + 1}`}</span>
                    <span className="text-[#2563eb]">&rarr;</span>
                    <span className="font-bold text-[#111111] bg-[#F2EEE9] px-2 py-0.5 rounded">{computeId(r, idx)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E0DEDA]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#555555] hover:text-[#1A1A1A] transition"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btnApplyCertIdFormat"
              onClick={handleApply}
              className="px-5 py-2.5 clay-btn-primary font-bold text-xs shadow flex items-center space-x-1.5"
            >
              <FiCheck className="text-sm" />
              <span>Apply to All Recipients</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

