'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Recipient, LogEntry, SmtpConfig, EmailTemplate } from '@/types';
import JSZip from 'jszip';
import Tooltip from './Tooltip';
import {
  FiMail,
  FiCheck,
  FiSend,
  FiCheckCircle,
  FiInfo,
  FiPackage,
  FiDownload,
  FiLoader,
  FiAlertCircle,
  FiAlertTriangle,
  FiPlay,
  FiRefreshCw,
  FiZap,
  FiShield
} from 'react-icons/fi';
import { TbFlask } from 'react-icons/tb';

interface BulkDispatchProps {
  recipients: Recipient[];
  smtpConfig: SmtpConfig;
  logs: LogEntry[];
  onLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onClearLogs: () => void;
  onSendIndividualEmail: (recipient: Recipient) => Promise<any>;
  onGeneratePdfDataUri: (recipient: Recipient) => Promise<{ filename: string; dataUrl: string }>;
  onBulkSendComplete?: (sentIds: Set<number>, failedIds: Set<number>) => Promise<void> | void;
  onResetStatuses?: () => void;
  onOpenSmtpModal: () => void;
  onOpenTemplateModal?: () => void;
  emailTemplate: EmailTemplate;
  onUpdateEmailTemplate: (newTpl: EmailTemplate) => void;
}

export default function BulkDispatch({
  recipients,
  smtpConfig,
  logs,
  onLog,
  onClearLogs,
  onSendIndividualEmail,
  onGeneratePdfDataUri,
  onBulkSendComplete,
  onResetStatuses,
  onOpenSmtpModal,
  onOpenTemplateModal,
  emailTemplate,
  onUpdateEmailTemplate
}: BulkDispatchProps) {
  const [delayMs, setDelayMs] = useState<number>(1500);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [skipAlreadySent, setSkipAlreadySent] = useState<boolean>(true);
  const [isWakeLockActive, setIsWakeLockActive] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>('Ready to start');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [logFilter, setLogFilter] = useState<'all' | 'dispatch' | 'error'>('all');
  const [showBodyPreview, setShowBodyPreview] = useState<boolean>(false);
  const cancelRef = useRef<boolean>(false);
  const wakeLockRef = useRef<any>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Screen Wake Lock helper to prevent laptop sleeping during dispatch
  const acquireWakeLock = async () => {
    try {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setIsWakeLockActive(true);
        onLog('⚡ Screen wake lock acquired: laptop sleep is prevented while dispatch is running.', 'info');
        wakeLockRef.current.addEventListener?.('release', () => {
          setIsWakeLockActive(false);
        });
      }
    } catch (err: any) {
      console.warn('[WakeLock] Unable to acquire screen wake lock:', err.message);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {}
      wakeLockRef.current = null;
      setIsWakeLockActive(false);
    }
  };

  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, []);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, logFilter]);

  // Derived counts
  const totalCount = recipients.length;
  const sentCountTotal = recipients.filter(r => r.status === 'Sent').length;
  const failedCountTotal = recipients.filter(r => r.status === 'Failed').length;
  const remainingCount = totalCount - sentCountTotal;

  const startBulkSend = async () => {
    if (recipients.length === 0) {
      alert('No recipients in the list to send certificates to.');
      return;
    }

    // Determine target queue based on skipAlreadySent setting
    const queue = skipAlreadySent
      ? recipients.filter(r => r.status !== 'Sent')
      : [...recipients];

    if (queue.length === 0) {
      alert(`All ${recipients.length} certificates have already been delivered! To resend, uncheck "Skip already sent" or click "Reset all to Ready".`);
      return;
    }

    setIsSending(true);
    cancelRef.current = false;
    await acquireWakeLock();

    const queueTotal = queue.length;
    let sessionSent = 0;
    let sessionFailed = 0;
    const sentIds = new Set<number>();
    const failedIds = new Set<number>();

    const previouslySent = recipients.length - queueTotal;
    if (previouslySent > 0 && skipAlreadySent) {
      onLog(`Resuming dispatch: Skipping ${previouslySent} already sent recipients. Dispatching to remaining ${queueTotal} recipients with ${delayMs}ms delay...`, 'info');
    } else {
      onLog(`Initiating bulk send for ${queueTotal} recipients with ${delayMs}ms throttle delay...`, 'info');
    }

    for (let i = 0; i < queueTotal; i++) {
      if (cancelRef.current) {
        onLog('Bulk dispatch paused/aborted by user. All sent certificates remain saved.', 'warning');
        break;
      }

      const recipient = queue[i];
      const overallIndex = previouslySent + i + 1;
      setProgressStatus(`Sending ${i + 1} of ${queueTotal} (${recipient.name})... [Total: ${overallIndex}/${recipients.length}]`);

      try {
        const success = await onSendIndividualEmail(recipient);
        if (success) {
          sessionSent++;
          sentIds.add(recipient.id);
        } else {
          sessionFailed++;
          failedIds.add(recipient.id);
        }
      } catch (err: any) {
        sessionFailed++;
        failedIds.add(recipient.id);
        onLog(`Delivery error for ${recipient.name}: ${err.message}`, 'error');
      }

      const pct = Math.round((overallIndex / recipients.length) * 100);
      setProgressPercent(pct);

      if (i < queueTotal - 1 && !cancelRef.current) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    // Flush batch status updates to guarantee all statuses persist
    if (onBulkSendComplete && (sentIds.size > 0 || failedIds.size > 0)) {
      await onBulkSendComplete(sentIds, failedIds);
    }

    await releaseWakeLock();
    setIsSending(false);
    setProgressStatus(`Finished! This run: ${sessionSent} sent, ${sessionFailed} failed. Total sent: ${sentCountTotal + sessionSent}/${recipients.length}`);
    onLog(`Bulk dispatch run finished: ${sessionSent} sent, ${sessionFailed} failed. Total delivered: ${sentCountTotal + sessionSent}/${recipients.length}`, sessionSent > 0 ? 'success' : 'warning');
  };

  const stopBulkSend = () => {
    cancelRef.current = true;
    releaseWakeLock();
    onLog('Cancellation requested by user. Halting bulk send... Already delivered certificates remain saved as Sent.', 'warning');
  };

  const handleDownloadAllZip = async () => {
    if (recipients.length === 0) {
      alert('No recipients in the list to generate certificates for.');
      return;
    }

    setIsZipping(true);
    onLog(`Beginning batch PDF generation for ${recipients.length} certificates...`, 'info');

    try {
      const zip = new JSZip();

      for (let i = 0; i < recipients.length; i++) {
        const r = recipients[i];
        const { filename, dataUrl } = await onGeneratePdfDataUri(r);
        const commaIdx = dataUrl.indexOf(',');
        const base64Data = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
        zip.file(filename, base64Data, { base64: true });
      }

      onLog(`All PDFs generated. Compressing into ZIP archive...`, 'info');
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificates-Batch-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      onLog(`ZIP archive created successfully! (${(blob.size / 1024 / 1024).toFixed(2)} MB)`, 'success');
    } catch (err: any) {
      onLog(`Batch ZIP generation failed: ${err.message}`, 'error');
      alert('Failed to generate ZIP archive: ' + err.message);
    } finally {
      setIsZipping(false);
    }
  };

  const insertVariable = (tag: string) => {
    onUpdateEmailTemplate({
      ...emailTemplate,
      body: emailTemplate.body ? `${emailTemplate.body} ${tag}` : tag
    });
  };

  const isMockOrIncomplete = smtpConfig.mockMode || !smtpConfig.user || !smtpConfig.pass;

  const chronologicalLogs = [...logs].reverse();
  const filteredLogs = chronologicalLogs.filter(l => {
    if (logFilter === 'error') return l.type === 'error';
    if (logFilter === 'dispatch') {
      const msg = l.message.toLowerCase();
      return (
        msg.includes('email') ||
        msg.includes('send') ||
        msg.includes('deliver') ||
        msg.includes('zip') ||
        msg.includes('batch') ||
        msg.includes('smtp')
      );
    }
    return true;
  });

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 3-Column Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch">

        {/* ========================================================= */}
        {/* COLUMN 1: CUSTOMIZE EMAIL TEMPLATE (IN-PLACE, NO MODAL)   */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 clay-card p-4 sm:p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E0DEDA]">
              <div className="flex items-center space-x-2">
                <FiMail className="text-lg text-[#D72638]" />
                <div>
                  <h3 className="font-bold text-[#1A1A1A] text-sm">Email Template</h3>
                  <p className="text-[10px] text-[#555555]">Personalize subject & message</p>
                </div>
              </div>
              <Tooltip content="Live template applied to all dispatches" position="left">
                <span className="text-[10px] text-[#D72638] font-bold bg-[#FAFAF8] px-2 py-0.5 rounded-full border border-[#E0DEDA]">
                  In-Place Editor
                </span>
              </Tooltip>
            </div>

            {/* Subject Line */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1A1A1A]">Subject Line</label>
              <input
                type="text"
                id="inputEmailSubject"
                value={emailTemplate.subject}
                onChange={e => onUpdateEmailTemplate({ ...emailTemplate, subject: e.target.value })}
                placeholder="Subject line with {name}..."
                className="w-full text-xs clay-inset p-2.5 font-semibold text-[#1A1A1A]"
              />
            </div>

            {/* Body Textarea */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#1A1A1A]">Email Body</label>
                <span className="text-[10px] text-[#777777] font-semibold">Spacing &amp; breaks preserved</span>
              </div>
              <textarea
                id="inputEmailBody"
                rows={5}
                value={emailTemplate.body}
                onChange={e => onUpdateEmailTemplate({ ...emailTemplate, body: e.target.value })}
                placeholder="Dear {name},&#10;&#10;Congratulations! Please find attached your verified certificate.&#10;&#10;Certificate ID: {id}&#10;Issue Date: {date}"
                className="w-full text-xs clay-inset p-2.5 font-mono leading-relaxed resize-none text-[#1A1A1A]"
              />
            </div>

            {/* Dynamic Tag Helpers */}
            <div className="pt-1.5 border-t border-[#E0DEDA]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-[#555555]">Insert placeholder:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBodyPreview(!showBodyPreview)}
                    className="text-[10px] text-[#2563eb] hover:underline font-bold"
                  >
                    {showBodyPreview ? 'Hide Preview' : 'Show Inbox Preview'}
                  </button>
                  {onOpenTemplateModal && (
                    <button
                      type="button"
                      id="btnEditEmailTemplate"
                      onClick={onOpenTemplateModal}
                      className="text-[10px] text-[#D72638] hover:underline font-bold"
                    >
                      Expand ↗
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: '{name}', desc: 'Recipient Name' },
                  { tag: '{id}', desc: 'Certificate ID' },
                  { tag: '{date}', desc: 'Issue Date' }
                ].map(item => (
                  <Tooltip key={item.tag} content={`Insert ${item.desc} into body`} position="top">
                    <button
                      type="button"
                      onClick={() => insertVariable(item.tag)}
                      className="clay-btn-secondary px-2 py-1 text-[11px] font-mono font-bold text-[#D72638] rounded-lg hover:border-[#D72638] transition active:scale-95"
                    >
                      {item.tag}
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* Optional Inline Inbox Preview */}
            {showBodyPreview && (
              <div className="p-2.5 rounded-lg border border-[#E0DEDA] bg-white space-y-1.5 text-xs text-[#111111] font-sans">
                <div className="text-[10px] font-bold text-[#888888] uppercase tracking-wider">Delivery Appearance:</div>
                <div className="space-y-2 pt-0.5 text-[11px]">
                  {(emailTemplate.body || '')
                    .replace(/\{name\}|\{\{name\}\}/gi, recipients[0]?.name || 'Alex Johnson')
                    .replace(/\{id\}|\{\{id\}\}/gi, recipients[0]?.certId || 'CERT-2026-001')
                    .replace(/\{date\}|\{\{date\}\}/gi, recipients[0]?.date || '04/09/2026')
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
            )}
          </div>

          <div className="pt-2 border-t border-[#E0DEDA] flex items-center justify-between text-[10px] text-[#777777]">
            <span className="flex items-center gap-1 font-semibold text-green-700">
              <FiCheck className="w-3 h-3 text-green-600" />
              <span>Auto-saved live</span>
            </span>
            <span className="text-[#555555] font-mono font-semibold">
              PDF attached automatically
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMN 2: BULK EMAIL DISPATCHER                           */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 clay-card p-4 sm:p-5 space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E0DEDA]">
              <div className="flex items-center space-x-2">
                <FiSend className="text-lg text-[#D72638]" />
                <div>
                  <h3 className="font-bold text-[#1A1A1A] text-sm">Bulk Email Dispatcher</h3>
                  <p className="text-[10px] text-[#555555]">Automated individual delivery</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#1A1A1A] bg-[#EDE8E1] px-2 py-0.5 rounded-full">
                {recipients.length} recipients
              </span>
            </div>

            {/* Live SMTP Status Banner */}
            <div
              id="smtpStatusBanner"
              className={`p-2.5 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.06)] ${
                isMockOrIncomplete
                  ? 'bg-[#FDECEF] border border-[#F8B4BD] text-[#8A1523]'
                  : 'bg-[#EBF8EE] border border-[#BBF0C5] text-[#15803D]'
              }`}
            >
              <div className="flex-1 min-w-0">
                <span className="font-bold flex items-center gap-1.5 text-[11px] truncate">
                  {isMockOrIncomplete ? (
                    <TbFlask className="w-3.5 h-3.5 text-[#8A1523] flex-shrink-0" />
                  ) : (
                    <FiCheckCircle className="w-3.5 h-3.5 text-[#15803D] flex-shrink-0" />
                  )}
                  <span id="smtpModeTitle">
                    {isMockOrIncomplete ? 'Simulation / Mock Mode' : 'Live SMTP Active'}
                  </span>
                </span>
                <p id="smtpModeDesc" className="text-[10px] mt-0.5 leading-tight truncate">
                  {isMockOrIncomplete
                    ? 'Emails simulated. Configure SMTP to deliver.'
                    : `Delivering via ${smtpConfig.user}`}
                </p>
              </div>
              <Tooltip content={isMockOrIncomplete ? 'Configure SMTP credentials' : 'Edit sender credentials'} position="top">
                <button
                  type="button"
                  id="btnConfigureSmtpBanner"
                  onClick={onOpenSmtpModal}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition w-full sm:w-auto text-center flex-shrink-0 ${
                    isMockOrIncomplete
                      ? 'clay-btn-primary'
                      : 'clay-btn-secondary'
                  }`}
                >
                  {isMockOrIncomplete ? 'Setup SMTP' : 'Edit'}
                </button>
              </Tooltip>
            </div>

            {/* Live Progress & Smart Resume Box */}
            <div className="p-3 clay-inset space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                  <FiShield className="text-[#D72638] w-3.5 h-3.5" />
                  <span>Dispatch Status:</span>
                </span>
                <div className="flex items-center gap-1 text-[11px] font-mono font-bold">
                  <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                    {sentCountTotal} Sent
                  </span>
                  {failedCountTotal > 0 && (
                    <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                      {failedCountTotal} Failed
                    </span>
                  )}
                  <span className="text-[#666666] bg-[#EDEBE8] px-1.5 py-0.5 rounded">
                    {remainingCount} Left
                  </span>
                </div>
              </div>

              {/* Resume Mode Checkbox */}
              <label className="flex items-start space-x-2 text-[11px] font-semibold text-[#1A1A1A] cursor-pointer select-none bg-[#FAFAF8] p-2 rounded-lg border border-[#E0DEDA]">
                <input
                  type="checkbox"
                  id="chkSkipAlreadySent"
                  checked={skipAlreadySent}
                  onChange={e => setSkipAlreadySent(e.target.checked)}
                  disabled={isSending}
                  className="mt-0.5 rounded text-[#D72638] focus:ring-[#D72638] accent-[#D72638]"
                />
                <div>
                  <span className="block font-bold text-[#1A1A1A]">Skip already sent (Smart Resume)</span>
                  <span className="text-[10px] text-[#666666] font-normal leading-tight">
                    Never re-sends to recipients marked &quot;Sent&quot;. If interrupted by sleep or closed tab, it picks up right where it stopped.
                  </span>
                </div>
              </label>

              {/* Wake Lock Active Indicator */}
              {isSending && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#15803D] bg-[#EBF8EE] border border-[#BBF0C5] p-1.5 rounded-lg">
                  <FiZap className="w-3.5 h-3.5 text-amber-500 animate-pulse flex-shrink-0" />
                  <span>Laptop sleep prevention active. Progress saves live after each email.</span>
                </div>
              )}

              {/* Reset to Ready button */}
              {sentCountTotal > 0 && onResetStatuses && !isSending && (
                <div className="flex items-center justify-between pt-1 border-t border-[#E0DEDA] text-[10px]">
                  <span className="text-[#666666]">Want to re-send to everyone?</span>
                  <button
                    type="button"
                    onClick={onResetStatuses}
                    className="text-[#D72638] hover:underline font-bold flex items-center gap-1"
                  >
                    <FiRefreshCw className="w-2.5 h-2.5" />
                    <span>Reset statuses to Ready</span>
                  </button>
                </div>
              )}
            </div>

            {/* Configuration summary */}
            <div className="p-3 clay-inset space-y-2 text-xs font-semibold">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#555555]">Total Recipients:</span>
                <span id="bulkTotalCount" className="font-bold text-[#1A1A1A]">{recipients.length}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#555555]">Queue to Deliver:</span>
                <span className="font-bold text-[#D72638] font-mono">
                  {skipAlreadySent ? `${remainingCount} remaining` : `${recipients.length} total`}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#555555]">Attachment Format:</span>
                <span className="font-bold text-[#1A1A1A]">Print-Ready PDF</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-[#E0DEDA] text-[11px]">
                <div className="flex items-center space-x-1">
                  <span className="text-[#555555]">Throttle Delay:</span>
                  <Tooltip content="Pause between consecutive emails to prevent rate limits" position="top">
                    <FiInfo className="w-3 h-3 text-[#888888] cursor-help inline" />
                  </Tooltip>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    id="bulkThrottleDelay"
                    min="500"
                    max="5000"
                    step="250"
                    value={delayMs}
                    onChange={e => setDelayMs(Number(e.target.value))}
                    disabled={isSending}
                    className="w-20 cursor-pointer"
                  />
                  <span id="bulkDelayDisplay" className="font-mono font-bold text-[#D72638] text-[11px]">
                    {(delayMs / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Bar Area */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold">
                <span id="bulkProgressStatus" className="text-[#1A1A1A] truncate max-w-[200px]">{progressStatus}</span>
                <span id="bulkProgressPercent" className="text-[#D72638] font-mono">{progressPercent}%</span>
              </div>
              <div className="w-full bg-[#EDEBE8] h-3 rounded-full overflow-hidden border border-[#E0DEDA] shadow-[inset_1px_1px_3px_rgba(0,0,0,0.15)]">
                <div
                  id="bulkProgressBar"
                  className="h-full bg-[#D72638] rounded-full transition-all duration-300 shadow-[0_1px_3px_rgba(215,38,56,0.4)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2">
            {!isSending ? (
              remainingCount === 0 && skipAlreadySent ? (
                <div className="space-y-2">
                  <div className="w-full py-2.5 bg-[#EBF8EE] border border-[#BBF0C5] text-[#15803D] rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm">
                    <FiCheckCircle className="text-sm text-green-600" />
                    <span>All {totalCount} Certificates Delivered!</span>
                  </div>
                  {onResetStatuses && (
                    <button
                      type="button"
                      onClick={onResetStatuses}
                      className="w-full py-1.5 clay-btn-secondary text-[11px] font-bold flex items-center justify-center space-x-1"
                    >
                      <FiRefreshCw className="text-xs" />
                      <span>Reset Statuses to Resend Again</span>
                    </button>
                  )}
                </div>
              ) : (
                <Tooltip
                  content={
                    sentCountTotal > 0 && skipAlreadySent
                      ? `Skip ${sentCountTotal} already sent certificates and deliver the remaining ${remainingCount}`
                      : 'Sequentially generate certificates and email them to each recipient'
                  }
                  position="top"
                  className="w-full"
                >
                  <button
                    type="button"
                    id="btnStartBulkSend"
                    onClick={startBulkSend}
                    className="w-full py-2.5 clay-btn-primary font-bold text-xs shadow flex items-center justify-center space-x-1.5"
                  >
                    {sentCountTotal > 0 && skipAlreadySent ? (
                      <>
                        <FiPlay className="text-sm fill-current" />
                        <span>Resume Dispatch ({remainingCount} Remaining)</span>
                      </>
                    ) : (
                      <>
                        <FiSend className="text-sm" />
                        <span>Send All Certificates via Email ({totalCount})</span>
                      </>
                    )}
                  </button>
                </Tooltip>
              )
            ) : (
              <button
                type="button"
                id="btnStopBulkSend"
                onClick={stopBulkSend}
                className="w-full py-2.5 clay-btn-dark font-bold text-xs shadow flex items-center justify-center space-x-1.5"
              >
                <span>Stop Dispatch (Progress Saved)</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMN 3: BULK CERTIFICATE ARCHIVE (ZIP)                  */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 clay-card p-4 sm:p-5 space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E0DEDA]">
              <div className="flex items-center space-x-2">
                <FiPackage className="text-lg text-[#D72638]" />
                <div>
                  <h3 className="font-bold text-[#1A1A1A] text-sm">Batch ZIP Archive</h3>
                  <p className="text-[10px] text-[#555555]">Download all certificates at once</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#D72638] bg-[#FAFAF8] px-2 py-0.5 rounded-full border border-[#E0DEDA]">
                Offline Bundle
              </span>
            </div>

            <p className="text-xs text-[#555555] leading-relaxed">
              Generates high-resolution, print-ready PDF certificates for all <strong>{recipients.length} recipients</strong> in your file and compresses them into a single .ZIP archive.
            </p>

            <div className="p-3 clay-inset space-y-1.5 text-xs text-[#1A1A1A]">
              <p className="font-bold text-[#D72638] text-[11px] flex items-center gap-1.5">
                <FiInfo className="w-3.5 h-3.5" />
                <span>Full Template Resolution:</span>
              </p>
              <p className="text-[#555555] text-[11px] leading-relaxed">
                Certificates are rendered at original 100% template resolution with crisp vector typography, suitable for commercial printing.
              </p>
            </div>

            <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E0DEDA] space-y-1 text-xs">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#666666]">Certificates Count:</span>
                <span className="font-bold font-mono text-[#1A1A1A]">{recipients.length} files</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#666666]">Naming Format:</span>
                <span className="font-mono text-[10px] text-[#D72638]">Certificate-[Name].pdf</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Tooltip content="Batch generate print-ready PDFs for all recipients into a ZIP file" position="top" className="w-full">
              <button
                type="button"
                id="btnDownloadAllZip"
                onClick={handleDownloadAllZip}
                disabled={isZipping || isSending}
                className="w-full py-2.5 clay-btn-dark disabled:opacity-50 font-bold text-xs shadow flex items-center justify-center space-x-1.5"
              >
                {isZipping ? (
                  <FiLoader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FiDownload className="w-3.5 h-3.5" />
                )}
                <span>{isZipping ? `Generating (${recipients.length})...` : 'Download All as ZIP Archive'}</span>
              </button>
            </Tooltip>
          </div>
        </div>

      </div>

      {/* Live Dispatch Terminal / Log Card - Guaranteed Deep Dark Skeuomorphic Console */}
      <div className="clay-card-dark overflow-hidden bg-[#161616] text-[#FAFAF8] shadow-[10px_10px_28px_rgba(0,0,0,0.4)] border border-[#2D2D2D]">
        {/* Terminal Header with 3 Dots and Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-5 py-2.5 border-b border-[#282828] bg-[#1E1E1E]">
          <div className="flex items-center space-x-2">
            <Tooltip content="Terminal Controls" position="right">
              <div className="flex items-center space-x-1.5 cursor-help">
                <div className="w-3 h-3 rounded-full bg-[#D72638] shadow-inner"></div>
                <div className="w-3 h-3 rounded-full bg-[#F59E0B] shadow-inner"></div>
                <div className="w-3 h-3 rounded-full bg-[#10B981] shadow-inner"></div>
              </div>
            </Tooltip>
            <span className="text-[#E0E0E0] font-sans text-xs ml-2 font-bold tracking-wide">
              Activity & Dispatch Logs ({logs.length})
            </span>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-center">
            {/* Filter Tabs */}
            <div className="flex items-center bg-[#121212] p-0.5 rounded-lg border border-[#2D2D2D] text-[10px]">
              <button
                type="button"
                onClick={() => setLogFilter('all')}
                className={`px-2 py-0.5 rounded-md font-bold transition ${
                  logFilter === 'all' ? 'bg-[#D72638] text-white' : 'text-[#888888] hover:text-white'
                }`}
              >
                All ({logs.length})
              </button>
              <button
                type="button"
                onClick={() => setLogFilter('dispatch')}
                className={`px-2 py-0.5 rounded-md font-bold transition ${
                  logFilter === 'dispatch' ? 'bg-[#D72638] text-white' : 'text-[#888888] hover:text-white'
                }`}
              >
                Dispatch ({logs.filter(l => {
                  const m = l.message.toLowerCase();
                  return m.includes('email') || m.includes('send') || m.includes('deliver') || m.includes('zip') || m.includes('batch') || m.includes('smtp');
                }).length})
              </button>
              <button
                type="button"
                onClick={() => setLogFilter('error')}
                className={`px-2 py-0.5 rounded-md font-bold transition ${
                  logFilter === 'error' ? 'bg-red-600 text-white' : 'text-[#888888] hover:text-white'
                }`}
              >
                Errors ({logs.filter(l => l.type === 'error').length})
              </button>
            </div>

            <Tooltip content="Clear all console logs" position="left">
              <button
                type="button"
                id="btnClearLogs"
                onClick={onClearLogs}
                className="text-[#9CA3AF] hover:text-white text-[11px] font-sans transition hover:underline px-1.5"
              >
                Clear
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Terminal Log Output Window with High Contrast Visibility */}
        <div
          id="dispatchLogTerminal"
          className="p-3.5 sm:p-4 h-44 sm:h-48 overflow-y-auto space-y-1.5 font-mono text-xs shadow-[inset_3px_3px_8px_rgba(0,0,0,0.6)] bg-[#121212] text-[#F5F0EB]"
        >
          {filteredLogs.length === 0 ? (
            <p className="text-[#9CA3AF] italic">
              {logs.length === 0
                ? '[System] Application initialized. Waiting for dispatch actions...'
                : `No logs match the "${logFilter}" filter.`}
            </p>
          ) : (
            filteredLogs.map(log => {
              let colorClass = 'text-[#F5F0EB]';
              let IconComp = FiInfo;
              let iconColor = 'text-blue-400';
              if (log.type === 'error') {
                colorClass = 'text-[#FF6B6B] font-semibold';
                IconComp = FiAlertCircle;
                iconColor = 'text-[#FF6B6B]';
              } else if (log.type === 'success') {
                colorClass = 'text-[#4ADE80] font-semibold';
                IconComp = FiCheckCircle;
                iconColor = 'text-[#4ADE80]';
              } else if (log.type === 'warning') {
                colorClass = 'text-[#FBBF24] font-semibold';
                IconComp = FiAlertTriangle;
                iconColor = 'text-[#FBBF24]';
              }

              return (
                <p key={log.id} className={`${colorClass} leading-relaxed flex items-start space-x-2`}>
                  <span className="text-[#888888] flex-shrink-0 font-mono text-[11px]">[{log.time}]</span>
                  <IconComp className={`${iconColor} w-3.5 h-3.5 flex-shrink-0 mt-0.5`} />
                  <span className="break-all">{log.message}</span>
                </p>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
}
