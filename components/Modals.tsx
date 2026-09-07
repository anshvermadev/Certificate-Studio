'use client';

import React, { useState, useEffect } from 'react';
import { SmtpConfig, EmailTemplate, Recipient } from '@/types';
import ClayDropdown from './ClayDropdown';
import Tooltip from './Tooltip';
import { formatDateDDMMYYYY, getTodayDDMMYYYY, toHtmlDateInputValue } from '@/lib/date';
import { FiSettings, FiMail, FiUser, FiCalendar, FiPlus, FiInfo, FiHash, FiEdit2, FiCheck, FiSliders } from 'react-icons/fi';

// ==================== SMTP SETTINGS MODAL ====================
interface SmtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  smtpConfig: SmtpConfig;
  onSave: (config: SmtpConfig) => void;
  onLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export function SmtpModal({ isOpen, onClose, smtpConfig, onSave, onLog }: SmtpModalProps) {
  const [form, setForm] = useState<SmtpConfig>(smtpConfig);
  const [preset, setPreset] = useState<string>(smtpConfig.mockMode ? 'simulation' : 'gmail');
  const [testEmail, setTestEmail] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);

  useEffect(() => {
    setForm(smtpConfig);
    setPreset(smtpConfig.mockMode ? 'simulation' : 'gmail');
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
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          mockMode: preset === 'simulation',
          testEmail
        })
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
    onSave({
      ...form,
      mockMode: preset === 'simulation'
    });
    onClose();
  };

  return (
    <div id="smtpModal" className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#FAFAF8] rounded-[24px] shadow-[10px_10px_32px_rgba(0,0,0,0.25),-6px_-6px_20px_rgba(255,255,255,0.95)] max-w-lg w-full overflow-hidden border border-[#E0DEDA] max-h-[90vh] flex flex-col">
        {/* Bold Red Window Header Strip with 3 Decorative Dots */}
        <div className="bg-[#D72638] px-6 py-4 flex items-center justify-between shadow-[0_4px_10px_rgba(215,38,56,0.3)]">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white/60 shadow-inner"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-white/60 shadow-inner"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-white/60 shadow-inner"></span>
            </div>
            <div className="flex items-center space-x-2 text-white ml-2">
              <FiSettings className="text-lg text-white" />
              <h3 className="font-bold text-base leading-tight tracking-wide">Email & SMTP Configuration</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/15 hover:bg-black/25 text-white flex items-center justify-center text-lg font-bold transition"
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Presets Selector */}
          <div>
            <label className="block text-xs font-bold text-[#1A1A1A] mb-1.5">Email Provider Preset:</label>
            <ClayDropdown
              id="smtpPresetSelect"
              value={preset}
              onChange={val => handlePresetChange(val)}
              options={[
                { value: 'simulation', label: 'Simulation / Mock Mode (Test without real credentials)' },
                { value: 'gmail', label: 'Gmail (App Password)' },
                { value: 'outlook', label: 'Outlook / Microsoft 365' },
                { value: 'yahoo', label: 'Yahoo Mail' },
                { value: 'custom', label: 'Custom SMTP Server' }
              ]}
            />
          </div>

          {/* Gmail App Password Guide Alert */}
          {preset === 'gmail' && (
            <div id="gmailTipBox" className="p-3.5 clay-inset space-y-1 text-xs text-[#1A1A1A]">
              <p className="font-bold text-[#D72638] flex items-center gap-1.5">
                <FiInfo className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Gmail Setup Tip:</span>
              </p>
              <p className="text-[#555555]">
                For Gmail, use your regular email address and a 16-character <b>Google App Password</b> (generated from your Google Account &gt; Security &gt; 2-Step Verification &gt; App Passwords).
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="col-span-2">
              <label className="block font-bold text-[#1A1A1A] mb-1">Sender Name (Display Name)</label>
              <input
                type="text"
                id="smtpSenderName"
                value={form.senderName}
                placeholder="e.g. Acme Academy"
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
                className="w-full clay-inset p-2.5 font-medium"
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
                className="w-full clay-inset p-2.5 font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">SSL/TLS</label>
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
              <label className="block font-bold text-[#1A1A1A] mb-1">Email / Username</label>
              <input
                type="email"
                id="smtpUser"
                value={form.user}
                placeholder="your-email@gmail.com"
                onChange={e => setForm({ ...form, user: e.target.value })}
                className="w-full clay-inset p-2.5 font-medium"
              />
            </div>
            <div className="col-span-2">
              <label className="block font-bold text-[#1A1A1A] mb-1">Password / App Password</label>
              <input
                type="password"
                id="smtpPass"
                value={form.pass}
                placeholder="••••••••••••••••"
                onChange={e => setForm({ ...form, pass: e.target.value })}
                className="w-full clay-inset p-2.5 font-medium"
              />
            </div>
          </div>

          {/* Test Connection Section */}
          <div className="pt-3 border-t border-[#E0DEDA] flex items-center space-x-2">
            <input
              type="email"
              id="smtpTestRecipient"
              placeholder="Send test email to (optional)"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              className="flex-1 text-xs clay-inset p-2.5 font-medium"
            />
            <Tooltip content="Send test handshake to verify server and port accessibility" position="top">
              <button
                type="button"
                id="btnTestSmtp"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2.5 clay-btn-dark font-bold text-xs whitespace-nowrap"
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
            </Tooltip>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E0DEDA]">
            <button
              type="button"
              id="btnCancelSmtpModal"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#555555] hover:text-[#1A1A1A] transition"
            >
              Cancel
            </button>
            <Tooltip content="Apply and save SMTP configuration" position="top">
              <button
                type="button"
                id="btnSaveSmtpSettings"
                onClick={handleSave}
                className="px-5 py-2.5 clay-btn-primary font-bold text-xs shadow"
              >
                Save Settings
              </button>
            </Tooltip>
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

