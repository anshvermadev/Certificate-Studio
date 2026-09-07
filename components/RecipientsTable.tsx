'use client';

import React, { useState } from 'react';
import { Recipient } from '@/types';
import Tooltip from './Tooltip';
import { formatDateDDMMYYYY } from '@/lib/date';
import { FiPlus, FiCheckCircle, FiXCircle, FiEye, FiFileText, FiSend, FiTrash2, FiArrowRight, FiHash, FiEdit2 } from 'react-icons/fi';

interface RecipientsTableProps {
  recipients: Recipient[];
  certIdPrefix?: string;
  onSelectPreview: (index: number) => void;
  onDownloadPdf: (recipient: Recipient) => void;
  onSendEmail: (recipient: Recipient) => Promise<any>;
  onDeleteRecipient: (id: number) => void;
  onOpenAddModal: () => void;
  onOpenFormatModal?: () => void;
  onEditRecipient?: (recipient: Recipient) => void;
  onGoToBulkDispatch: () => void;
  onSyncStatusFromLogs?: () => void;
  onMarkAllStatus?: (status: 'Sent' | 'Ready') => void;
}

export default function RecipientsTable({
  recipients,
  certIdPrefix = 'CERT-',
  onSelectPreview,
  onDownloadPdf,
  onSendEmail,
  onDeleteRecipient,
  onOpenAddModal,
  onOpenFormatModal,
  onEditRecipient,
  onGoToBulkDispatch,
  onSyncStatusFromLogs,
  onMarkAllStatus
}: RecipientsTableProps) {
  const [filterText, setFilterText] = useState('');

  const filtered = recipients.filter(r => {
    if (!filterText) return true;
    const term = filterText.toLowerCase();
    return (
      (r.name && r.name.toLowerCase().includes(term)) ||
      (r.email && r.email.toLowerCase().includes(term)) ||
      (r.certId && r.certId.toLowerCase().includes(term))
    );
  });

  return (
    <div className="clay-card p-4 sm:p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E0DEDA]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-[#1A1A1A] text-base sm:text-lg">Recipients List</h3>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {recipients.filter(r => r.status === 'Sent').length} / {recipients.length} Sent
            </span>
          </div>
          <p className="text-xs text-[#555555] mt-0.5">
            Send certificates individually, download print-ready PDFs, or review resolved names.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <Tooltip content="Filter rows by recipient name, email, or certificate ID" position="bottom" className="w-full sm:w-auto">
            <input
              type="text"
              id="recipientSearchInput"
              placeholder="Search by name or email..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              className="text-xs clay-inset px-3.5 py-2.5 w-full sm:w-44 md:w-56 font-medium"
            />
          </Tooltip>

          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {onSyncStatusFromLogs && (
              <Tooltip content="Sync table statuses from dispatch activity logs" position="bottom">
                <button
                  type="button"
                  id="btnSyncStatusFromLogs"
                  onClick={onSyncStatusFromLogs}
                  className="clay-btn-secondary px-3 py-2 text-xs font-bold whitespace-nowrap flex items-center justify-center space-x-1 hover:text-emerald-700 transition"
                >
                  <FiCheckCircle className="text-emerald-600 text-sm" />
                  <span>Sync Sent Status</span>
                </button>
              </Tooltip>
            )}

            {onMarkAllStatus && (
              <Tooltip content="Mark all recipients as Sent" position="bottom">
                <button
                  type="button"
                  onClick={() => onMarkAllStatus('Sent')}
                  className="clay-btn-secondary px-2.5 py-2 text-xs font-bold text-[#555555] hover:text-emerald-700 transition"
                  title="Mark All Sent"
                >
                  Mark All Sent
                </button>
              </Tooltip>
            )}

            {onOpenFormatModal && (
              <Tooltip content="Configure Certificate ID prefix or format numeric IDs" position="bottom" className="flex-1 sm:flex-none">
                <button
                  type="button"
                  id="btnOpenFormatCertIdModal"
                  onClick={onOpenFormatModal}
                  className="w-full sm:w-auto clay-btn-secondary px-3 py-2 text-xs font-bold whitespace-nowrap flex items-center justify-center space-x-1.5"
                >
                  <FiHash className="text-[#D72638] text-sm" />
                  <span>ID Format ({certIdPrefix || 'CERT-'})</span>
                </button>
              </Tooltip>
            )}

            <Tooltip content="Manually add a single recipient without an Excel file" position="bottom" className="flex-1 sm:flex-none">
              <button
                type="button"
                id="btnOpenAddMemberModal"
                onClick={onOpenAddModal}
                className="w-full sm:w-auto clay-btn-secondary px-3 py-2 text-xs font-bold whitespace-nowrap flex items-center justify-center space-x-1.5"
              >
                <FiPlus className="text-[#D72638] text-sm" />
                <span>Add Member</span>
              </button>
            </Tooltip>

            <Tooltip content="Go to Step 4 to dispatch emails or download ZIP" position="bottom" className="flex-1 sm:flex-none">
              <button
                type="button"
                id="btnGoToBulkDispatch"
                onClick={onGoToBulkDispatch}
                className="w-full sm:w-auto clay-btn-primary px-3.5 py-2 text-xs font-bold whitespace-nowrap flex items-center justify-center space-x-1.5"
              >
                <span>Bulk Dispatch</span>
                <FiArrowRight className="text-sm" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Recipients Table */}
      <div className="overflow-x-auto rounded-xl border border-[#E0DEDA]">
        <table className="w-full min-w-[620px] text-left text-xs text-[#1A1A1A]">
          <thead className="bg-[#EDEBE8] text-[#1A1A1A] font-bold uppercase tracking-wider border-b border-[#E0DEDA]">
            <tr>
              <th className="py-3.5 px-4 w-12">#</th>
              <th className="py-3.5 px-4">Recipient Name</th>
              <th className="py-3.5 px-4">Email Address</th>
              <th className="py-3.5 px-4">Certificate ID</th>
              <th className="py-3.5 px-4">Issue Date</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Individual Actions</th>
            </tr>
          </thead>
          <tbody id="recipientsTableBody" className="divide-y divide-[#E0DEDA] font-medium bg-[#FAFAF8]">
            {recipients.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-[#777777]">
                  No Excel file uploaded yet. Go to Step 1 to upload or load demo data.
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-6 text-[#777777]">
                  No recipients match the search criteria.
                </td>
              </tr>
            ) : (
              filtered.map(r => {
                const originalIndex = recipients.findIndex(item => item.id === r.id);

                let statusBadge = (
                  <span className="clay-badge clay-badge-neutral">
                    {r.status || 'Ready'}
                  </span>
                );
                if (r.status === 'Sent') {
                  statusBadge = (
                    <span className="clay-badge clay-badge-green inline-flex items-center gap-1">
                      <span>Sent</span>
                      <FiCheckCircle className="text-green-700 w-3 h-3" />
                    </span>
                  );
                } else if (r.status === 'Failed') {
                  statusBadge = (
                    <span className="clay-badge clay-badge-red inline-flex items-center gap-1">
                      <span>Failed</span>
                      <FiXCircle className="text-red-700 w-3 h-3" />
                    </span>
                  );
                } else if (r.status === 'Sending...') {
                  statusBadge = (
                    <span className="clay-badge clay-badge-red animate-pulse">
                      Sending...
                    </span>
                  );
                }

                return (
                  <tr key={r.id} className="hover:bg-[#F2EEE9] transition border-b border-[#E0DEDA]">
                    <td className="py-3 px-4 font-mono text-[#777777]">{r.id}</td>
                    <td className="py-3 px-4 font-bold text-[#1A1A1A]">{r.name}</td>
                    <td className="py-3 px-4 text-[#555555]">
                      {r.email ? r.email : <span className="text-[#D72638] italic">No Email</span>}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#555555]">{r.certId || '-'}</td>
                    <td className="py-3 px-4 font-mono text-[#555555]">{formatDateDDMMYYYY(r.date)}</td>
                    <td className="py-3 px-4">{statusBadge}</td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <Tooltip content="Preview on Designer canvas" position="top">
                        <button
                          type="button"
                          onClick={() => onSelectPreview(originalIndex !== -1 ? originalIndex : 0)}
                          className="btn-preview-row clay-btn-secondary px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1"
                        >
                          <FiEye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>
                      </Tooltip>

                      <Tooltip content="Download print-ready PDF" position="top">
                        <button
                          type="button"
                          onClick={() => onDownloadPdf(r)}
                          className="btn-download-row clay-btn-dark px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1"
                        >
                          <FiFileText className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </Tooltip>

                      <Tooltip content="Send individual certificate email" position="top">
                        <button
                          type="button"
                          onClick={() => onSendEmail(r)}
                          disabled={r.status === 'Sending...'}
                          className="btn-send-row clay-btn-primary px-3 py-1 text-xs font-bold disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <FiSend className="w-3.5 h-3.5" />
                          <span>Send</span>
                        </button>
                      </Tooltip>

                      {onEditRecipient && (
                        <Tooltip content="Edit recipient details or Certificate ID" position="top">
                          <button
                            type="button"
                            onClick={() => onEditRecipient(r)}
                            className="btn-edit-row clay-btn-secondary px-2 py-1 text-xs font-bold text-[#555555] hover:text-[#1A1A1A] inline-flex items-center justify-center"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      )}

                      <Tooltip content="Remove recipient" position="top">
                        <button
                          type="button"
                          onClick={() => onDeleteRecipient(r.id)}
                          className="btn-delete-row clay-btn-secondary text-[#D72638] px-2.5 py-1 text-xs font-bold hover:bg-[#FDECEF] inline-flex items-center justify-center"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
