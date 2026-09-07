'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEvent } from '@/context/EventContext';
import RecipientsTable from '@/components/RecipientsTable';
import { AddRecipientModal, FormatCertIdModal, EditRecipientModal } from '@/components/Modals';
import { generateCertificatePdf, downloadCertificatePdf } from '@/lib/pdf';
import { reconcileSentStatusFromLogs } from '@/lib/reconcile';
import { Recipient } from '@/types';
import Link from 'next/link';
import { FiArrowRight, FiArrowLeft } from 'react-icons/fi';
import Tooltip from '@/components/Tooltip';

export default function EventRecipientsPage() {
  const router = useRouter();
  const { event, updateEvent, saveNow, templateImage, smtpConfig, addLog } = useEvent();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);

  if (!event) return null;

  const recipients = event.recipients || [];

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

  // Preview on Designer canvas
  const handleSelectPreview = (idx: number) => {
    updateEvent({ selectedRecipientIndex: idx });
    router.push(`/events/${event.id}/designer`);
  };

  // Download single PDF
  const handleDownloadPdf = async (recipient: Recipient) => {
    try {
      addLog(`Generating certificate PDF for ${recipient.name}...`, 'info');
      await downloadCertificatePdf(recipient, templateImage, event.fields, event.qrConfig, event.name);
      addLog(`Downloaded certificate for ${recipient.name}.`, 'success');
    } catch (err: any) {
      alert(`Error generating PDF: ${err.message}`);
      addLog(`PDF generation error: ${err.message}`, 'error');
    }
  };

  // Send individual email with atomic status updater
  const handleSendEmail = async (recipient: Recipient): Promise<boolean> => {
    if (!recipient.email || !recipient.email.includes('@')) {
      alert(`Recipient "${recipient.name}" does not have a valid email address.`);
      return false;
    }

    // Set status to sending atomically
    updateEvent(prev => ({
      recipients: (prev.recipients || []).map(r => r.id === recipient.id ? { ...r, status: 'Sending...' } : r)
    }));

    try {
      addLog(`Generating certificate PDF for ${recipient.name} (${recipient.email})...`, 'info');
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
        addLog(data.message || `Email sent successfully to ${recipient.email}!`, 'success');
        return true;
      } else {
        updateEvent(prev => ({
          recipients: (prev.recipients || []).map(r => r.id === recipient.id ? { ...r, status: 'Failed' } : r)
        }));
        await saveNow();
        addLog(`Email failed for ${recipient.email}: ${data.error}`, 'error');
        return false;
      }
    } catch (err: any) {
      updateEvent(prev => ({
        recipients: (prev.recipients || []).map(r => r.id === recipient.id ? { ...r, status: 'Failed' } : r)
      }));
      await saveNow();
      addLog(`Send email exception: ${err.message}`, 'error');
      return false;
    }
  };

  // Manually sync sent statuses from dispatch activity logs
  const handleSyncStatusFromLogs = async () => {
    if (!event) return;
    const { updated, count, newRecipients } = reconcileSentStatusFromLogs(event);
    if (updated) {
      updateEvent({ recipients: newRecipients });
      await saveNow();
      addLog(`Updated ${count} recipient statuses to "Sent" based on dispatch logs.`, 'success');
    } else {
      addLog('All recipient statuses are already synchronized with dispatch logs.', 'info');
    }
  };

  // Bulk mark all statuses (e.g. Sent or Ready)
  const handleMarkAllStatus = async (status: 'Sent' | 'Ready') => {
    if (window.confirm(`Are you sure you want to mark all ${recipients.length} recipients as "${status}"?`)) {
      updateEvent(prev => ({
        recipients: (prev.recipients || []).map(r => ({ ...r, status }))
      }));
      await saveNow();
      addLog(`Marked all ${recipients.length} recipients as "${status}".`, 'success');
    }
  };

  // Delete recipient atomically
  const handleDeleteRecipient = (id: number) => {
    updateEvent(prev => {
      const nextRecipients = (prev.recipients || []).filter(r => r.id !== id);
      return {
        recipients: nextRecipients,
        selectedRecipientIndex: Math.min(prev.selectedRecipientIndex || 0, Math.max(0, nextRecipients.length - 1))
      };
    });
    addLog(`Recipient #${id} removed.`, 'info');
  };

  // Add new recipient atomically
  const handleAddRecipient = (newRecipient: Recipient) => {
    updateEvent(prev => ({
      recipients: [...(prev.recipients || []), newRecipient]
    }));
    addLog(`Added recipient "${newRecipient.name}".`, 'success');
  };

  // Apply formatted Certificate IDs atomically
  const handleApplyCertIdFormat = (newPrefix: string, updatedRecipients: Recipient[]) => {
    updateEvent(prev => ({
      recipients: updatedRecipients,
      certIdPrefix: newPrefix
    }));
    addLog(`Applied Certificate ID format with prefix "${newPrefix}" to ${updatedRecipients.length} recipients.`, 'success');
  };

  // Save edited recipient atomically
  const handleSaveEditedRecipient = (updated: Recipient) => {
    updateEvent(prev => ({
      recipients: (prev.recipients || []).map(r => r.id === updated.id ? updated : r)
    }));
    addLog(`Updated details for "${updated.name}".`, 'success');
  };

  const nextId = recipients.length > 0 ? Math.max(...recipients.map(r => r.id || 0)) + 1 : 1;

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A] tracking-tight">Step 3: Recipients &amp; Individual Dispatch</h2>
          <p className="text-xs text-[#666666] mt-0.5">
            Manage recipient records for &quot;{event.name}&quot;. All changes and send statuses persist automatically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip content="Return to Step 2 Visual Designer" position="bottom">
            <Link
              href={`/events/${event.id}/designer`}
              className="clay-btn-secondary px-4 py-2 text-xs font-bold flex items-center space-x-1.5"
            >
              <FiArrowLeft className="text-xs" />
              <span>Designer</span>
            </Link>
          </Tooltip>

          <Tooltip content="Proceed to Step 4 Bulk Dispatch and ZIP download" position="bottom">
            <Link
              href={`/events/${event.id}/dispatch`}
              className="clay-btn-primary px-5 py-2 text-xs font-bold flex items-center space-x-1.5"
            >
              <span>Bulk Dispatch</span>
              <FiArrowRight className="text-xs" />
            </Link>
          </Tooltip>
        </div>
      </div>

      <RecipientsTable
        recipients={recipients}
        certIdPrefix={event.certIdPrefix || 'CERT-'}
        onSelectPreview={handleSelectPreview}
        onDownloadPdf={handleDownloadPdf}
        onSendEmail={handleSendEmail}
        onDeleteRecipient={handleDeleteRecipient}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenFormatModal={() => setIsFormatModalOpen(true)}
        onEditRecipient={(r) => setEditingRecipient(r)}
        onGoToBulkDispatch={() => router.push(`/events/${event.id}/dispatch`)}
        onSyncStatusFromLogs={handleSyncStatusFromLogs}
        onMarkAllStatus={handleMarkAllStatus}
      />

      <AddRecipientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        nextId={nextId}
        prefix={event.certIdPrefix || 'CERT-'}
        onAdd={handleAddRecipient}
      />

      <FormatCertIdModal
        isOpen={isFormatModalOpen}
        onClose={() => setIsFormatModalOpen(false)}
        currentPrefix={event.certIdPrefix || 'CERT-'}
        recipients={recipients}
        onApply={handleApplyCertIdFormat}
      />

      <EditRecipientModal
        isOpen={!!editingRecipient}
        onClose={() => setEditingRecipient(null)}
        recipient={editingRecipient}
        onSave={handleSaveEditedRecipient}
      />
    </section>
  );
}
