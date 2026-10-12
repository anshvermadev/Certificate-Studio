'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useEvent } from '@/context/EventContext';
import BulkDispatch from '@/components/BulkDispatch';
import { SmtpModal, EmailTemplateModal } from '@/components/Modals';
import { generateCertificatePdf } from '@/lib/pdf';
import { Recipient, EmailTemplate } from '@/types';
import { reconcileSentStatusFromLogs } from '@/lib/reconcile';
import { FiArrowLeft, FiGrid } from 'react-icons/fi';
import Tooltip from '@/components/Tooltip';

export default function EventDispatchPage() {
  const {
    event,
    updateEvent,
    templateImage,
    smtpConfig,
    updateSmtp,
    saveNow,
    addLog
  } = useEvent();

  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Automatically reconcile sent statuses on mount if dispatch logs show certificates were delivered
  useEffect(() => {
    if (event) {
      const { updated, count, newRecipients } = reconcileSentStatusFromLogs(event);
      if (updated) {
        updateEvent({ recipients: newRecipients });
        saveNow();
        addLog(`Synchronized ${count} recipient statuses from dispatch activity logs.`, 'success');
      }
    }
  }, [event?.id]);

  if (!event) return null;

  const recipients = event.recipients || [];

  const handleSendIndividualEmail = async (recipient: Recipient): Promise<boolean> => {
    if (!recipient.email || !recipient.email.includes('@')) {
      addLog(`Recipient "${recipient.name}" has no valid email. Skipped.`, 'warning');
      return false;
    }

    try {
      const { filename, dataUrl } = await generateCertificatePdf(recipient, templateImage, event.fields, event.qrConfig, event.name);

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpConfig,
          recipient,
          emailSubject: event.emailTemplate.subject,
          emailBody: event.emailTemplate.body,
          attachmentDataUrl: dataUrl,
          attachmentFilename: filename
        })
      });

      const data = await res.json();
      if (data.success) {
        updateEvent(prev => ({
          recipients: (prev.recipients || []).map(r => r.id === recipient.id ? { ...r, status: 'Sent' } : r)
        }));
        await saveNow();
        addLog(`Delivered certificate to ${recipient.name} (${recipient.email})`, 'success');
        return true;
      } else {
        updateEvent(prev => ({
          recipients: (prev.recipients || []).map(r => r.id === recipient.id ? { ...r, status: 'Failed' } : r)
        }));
        await saveNow();
        addLog(`Failed for ${recipient.name} (${recipient.email}): ${data.error || 'Delivery failed'}`, 'error');
        return false;
      }
    } catch (err: any) {
      updateEvent(prev => ({
        recipients: (prev.recipients || []).map(r => r.id === recipient.id ? { ...r, status: 'Failed' } : r)
      }));
      await saveNow();
      addLog(`Error sending to ${recipient.name}: ${err.message}`, 'error');
      return false;
    }
  };

  const handleGeneratePdfDataUri = async (recipient: Recipient) => {
    return generateCertificatePdf(recipient, templateImage, event.fields, event.qrConfig, event.name);
  };

  const handleSaveEmailTemplate = (newTpl: EmailTemplate) => {
    updateEvent({ emailTemplate: newTpl });
    addLog('Email message template updated and saved.', 'success');
  };

  const handleClearLogs = () => {
    updateEvent({ logs: [] });
  };

  const handleBulkSendComplete = async (sentIds: Set<number>, failedIds: Set<number>) => {
    updateEvent(prev => {
      const currentRecipients = prev.recipients || [];
      return {
        recipients: currentRecipients.map(r => {
          if (sentIds.has(r.id)) return { ...r, status: 'Sent' as const };
          if (failedIds.has(r.id)) return { ...r, status: 'Failed' as const };
          return r;
        })
      };
    });
    await saveNow();
  };

  const handleResetStatusesToReady = async () => {
    if (!window.confirm('Reset all recipient statuses back to "Ready"? This will allow resending certificates to everyone.')) {
      return;
    }
    updateEvent(prev => ({
      recipients: (prev.recipients || []).map(r => ({ ...r, status: 'Ready' as const }))
    }));
    await saveNow();
    addLog('All recipient statuses reset to Ready.', 'info');
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A] tracking-tight">Step 4: Bulk Dispatch & ZIP Export</h2>
          <p className="text-xs text-[#666666] mt-0.5">
            Send bulk personalized emails or download a batch ZIP archive for &quot;{event.name}&quot;.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip content="Return to Step 3 Recipients Table" position="bottom">
            <Link
              href={`/events/${event.id}/recipients`}
              className="clay-btn-secondary px-4 py-2 text-xs font-bold flex items-center space-x-1.5"
            >
              <FiArrowLeft className="text-xs" />
              <span>Recipients</span>
            </Link>
          </Tooltip>

          <Tooltip content="View all events on the dashboard" position="bottom">
            <Link
              href="/events"
              className="clay-btn-secondary px-4 py-2 text-xs font-bold flex items-center space-x-1.5"
            >
              <FiGrid className="text-xs" />
              <span>All Events</span>
            </Link>
          </Tooltip>
        </div>
      </div>

      <BulkDispatch
        recipients={recipients}
        smtpConfig={smtpConfig}
        logs={event.logs || []}
        onLog={addLog}
        onClearLogs={handleClearLogs}
        onSendIndividualEmail={handleSendIndividualEmail}
        onGeneratePdfDataUri={handleGeneratePdfDataUri}
        onBulkSendComplete={handleBulkSendComplete}
        onResetStatuses={handleResetStatusesToReady}
        onOpenSmtpModal={() => setIsSmtpModalOpen(true)}
        onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
        emailTemplate={event.emailTemplate}
        onUpdateEmailTemplate={handleSaveEmailTemplate}
      />

      <SmtpModal
        isOpen={isSmtpModalOpen}
        onClose={() => setIsSmtpModalOpen(false)}
        smtpConfig={smtpConfig}
        onSave={async (newConfig) => {
          await updateSmtp(newConfig);
          addLog('SMTP configuration saved successfully.', 'success');
        }}
        onLog={addLog}
      />

      <EmailTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        emailTemplate={event.emailTemplate}
        onSave={handleSaveEmailTemplate}
      />
    </section>
  );
}
