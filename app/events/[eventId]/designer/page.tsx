'use client';

import React from 'react';
import Link from 'next/link';
import { useEvent } from '@/context/EventContext';
import DesignerCanvas from '@/components/DesignerCanvas';
import { FiArrowRight, FiArrowLeft, FiAlertTriangle } from 'react-icons/fi';
import Tooltip from '@/components/Tooltip';

export default function EventDesignerPage() {
  const { event, updateEvent, templateImage, addLog } = useEvent();

  if (!event) return null;

  const recipients = event.recipients || [];
  const selectedIndex = event.selectedRecipientIndex || 0;
  const activeField = event.activeField || 'name';

  const setSelectedRecipientIndex = (idx: number) => {
    updateEvent({ selectedRecipientIndex: idx });
  };

  const setActiveField = (field: any) => {
    updateEvent({ activeField: field });
  };

  const setFields = (updater: any) => {
    updateEvent(prev => {
      const currentFields = prev.fields || {};
      const nextFields = typeof updater === 'function' ? updater(currentFields) : updater;
      return { fields: { ...nextFields } };
    });
  };

  return (
    <section className="space-y-4">
      {/* Top action / navigation header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A] tracking-tight">Step 2: Visual Certificate Designer</h2>
          <p className="text-xs text-[#666666] mt-0.5">
            Click text directly on canvas or use sliders to style & position fields. All positions are auto-saved.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip content="Return to Step 1 to upload or re-map spreadsheet" position="bottom">
            <Link
              href={`/events/${event.id}/upload`}
              className="clay-btn-secondary px-4 py-2 text-xs font-bold flex items-center space-x-1.5"
            >
              <FiArrowLeft className="text-xs" />
              <span>Back to Upload</span>
            </Link>
          </Tooltip>

          <Tooltip content="Proceed to Step 3 to review all recipient records" position="bottom">
            <Link
              href={`/events/${event.id}/recipients`}
              className="clay-btn-primary px-5 py-2 text-xs font-bold flex items-center space-x-1.5"
            >
              <span>Recipients List</span>
              <FiArrowRight className="text-xs" />
            </Link>
          </Tooltip>
        </div>
      </div>

      {!event.templateDataUrl && (
        <div className="clay-card p-4 border-l-4 border-l-amber-500 flex items-center justify-between text-xs text-[#1A1A1A]">
          <div className="flex items-center space-x-2">
            <FiAlertTriangle className="text-amber-600 text-base flex-shrink-0" />
            <span>
              <strong>No custom template uploaded.</strong> Using the default certificate background. You can upload a custom template in Step 1.
            </span>
          </div>
          <Link href={`/events/${event.id}/upload`} className="text-[#D72638] font-bold hover:underline whitespace-nowrap ml-2">
            Upload Template &rarr;
          </Link>
        </div>
      )}

      {/* 3-Column Designer Canvas */}
      <DesignerCanvas
        templateImage={templateImage}
        recipients={recipients}
        selectedRecipientIndex={selectedIndex}
        setSelectedRecipientIndex={setSelectedRecipientIndex}
        activeField={activeField}
        setActiveField={setActiveField}
        fields={event.fields}
        setFields={setFields}
        availableHeaders={event.availableHeaders || []}
        qrConfig={event.qrConfig}
        onUpdateQrConfig={(newQr) => {
          updateEvent(prev => ({
            qrConfig: { ...(prev.qrConfig || {}), ...newQr }
          }));
        }}
        eventName={event.name}
        onLog={addLog}
      />
    </section>
  );
}
