'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useEvent } from '@/context/EventContext';
import Tooltip from '@/components/Tooltip';
import ClayDropdown from '@/components/ClayDropdown';
import { formatDateDDMMYYYY, getTodayDDMMYYYY } from '@/lib/date';
import { formatCertificateId } from '@/lib/cert-id';
import {
  FiImage,
  FiFolder,
  FiFile,
  FiCheck,
  FiArrowRight,
  FiCheckCircle,
  FiRefreshCw,
  FiTrash2,
  FiUploadCloud
} from 'react-icons/fi';
import { TbFileSpreadsheet } from 'react-icons/tb';

export default function EventUploadPage() {
  const { event, updateEvent, addLog, loadSampleDataIntoCurrentEvent } = useEvent();

  const templateInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const [isTemplateDragging, setIsTemplateDragging] = useState(false);
  const [isExcelDragging, setIsExcelDragging] = useState(false);

  if (!event) return null;

  const templateFileName = event.templateFileName || 'No custom template selected';
  const hasTemplate = Boolean(event.templateDataUrl);
  const templateStatusBadge = hasTemplate
    ? { text: 'Custom Template Active', isCustom: true }
    : { text: 'Default Template Active', isCustom: false };

  const excelFileName = event.excelFileName || 'No spreadsheet selected';
  const recipientsCount = event.recipients?.length || 0;
  const excelStatusBadge = recipientsCount > 0
    ? { text: `${recipientsCount} Recipients Loaded`, isLoaded: true }
    : { text: 'No Spreadsheet Loaded', isLoaded: false };

  const isDetectionCardVisible = Boolean(
    event.availableHeaders && event.availableHeaders.length > 0 && recipientsCount > 0
  );

  // Template upload handler
  const handleTemplateUpload = (file: File) => {
    if (!file.type.startsWith('image/') && !file.name.endsWith('.svg')) {
      alert('Please upload an image file (PNG, JPG, SVG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      updateEvent({
        templateFileName: file.name,
        templateDataUrl: dataUrl
      });
      addLog(`Template background updated: "${file.name}"`, 'success');
    };
    reader.readAsDataURL(file);
  };

  // Revert custom template back to default
  const handleRemoveTemplate = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm('Remove this custom template and revert back to the default certificate template?')) {
      updateEvent({
        templateFileName: '',
        templateDataUrl: ''
      });
      if (templateInputRef.current) templateInputRef.current.value = '';
      addLog('Custom template removed. Reverted to default template.', 'info');
    }
  };

  // Excel upload handler
  const handleExcelUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('excel', file);

      addLog(`Uploading and parsing "${file.name}"...`, 'info');

      const res = await fetch('/api/upload-excel', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        const detected = data.detectedMapping;
        updateEvent({
          excelFileName: file.name,
          availableHeaders: data.headers || [],
          rawRows: data.rawRows || [],
          recipients: data.recipients || [],
          fullNameCol: detected?.fullNameCol || '',
          firstNameCol: detected?.firstNameCol || '',
          lastNameCol: detected?.lastNameCol || '',
          emailCol: detected?.emailCol || '',
          dateCol: detected?.dateCol || '',
          idCol: detected?.idCol || '',
          nameMode: detected?.isSplitName ? 'split' : 'single',
          selectedRecipientIndex: 0
        });

        addLog(`Spreadsheet parsed: ${data.recipients.length} recipients imported.`, 'success');
      } else {
        alert(data.error || 'Failed to parse Excel file.');
        addLog(`Excel parse error: ${data.error}`, 'error');
      }
    } catch (err: any) {
      alert(`Error uploading Excel: ${err.message}`);
      addLog(`Excel upload error: ${err.message}`, 'error');
    }
  };

  // Clear spreadsheet and all recipients
  const handleClearExcel = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm(`Are you sure you want to remove all ${recipientsCount} recipients and clear this spreadsheet?`)) {
      updateEvent({
        excelFileName: '',
        availableHeaders: [],
        rawRows: [],
        recipients: [],
        fullNameCol: '',
        firstNameCol: '',
        lastNameCol: '',
        emailCol: '',
        dateCol: '',
        idCol: '',
        selectedRecipientIndex: 0
      });
      if (excelInputRef.current) excelInputRef.current.value = '';
      addLog('Spreadsheet and recipients cleared.', 'info');
    }
  };

  // Drag & drop handlers for Template
  const handleTemplateDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTemplateDragging(true);
  };
  const handleTemplateDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTemplateDragging(false);
  };
  const handleTemplateDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTemplateDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleTemplateUpload(file);
  };

  // Drag & drop handlers for Excel
  const handleExcelDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExcelDragging(true);
  };
  const handleExcelDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExcelDragging(false);
  };
  const handleExcelDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExcelDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleExcelUpload(file);
  };

  // Reapply mapping when columns are changed
  const reapplyMapping = (
    mode: 'auto' | 'single' | 'split',
    fullCol: string,
    firstCol: string,
    lastCol: string,
    emailC: string,
    dateC: string,
    idC: string,
    rows: any[],
    prefixArg?: string
  ) => {
    if (!rows || rows.length === 0) return;

    const prefix = prefixArg !== undefined ? prefixArg : (event.certIdPrefix || 'CERT-');

    const newRecipients = rows.map((row, idx) => {
      let name = '';
      if (mode === 'split' && firstCol && lastCol) {
        const first = String(row[firstCol] || '').trim();
        const last = String(row[lastCol] || '').trim();
        name = `${first} ${last}`.trim();
      } else if (fullCol) {
        name = String(row[fullCol] || '').trim();
      }

      if (!name) {
        name = `Recipient ${idx + 1}`;
      }

      const email = emailC ? String(row[emailC] || '').trim() : '';
      const rawDate = dateC ? row[dateC] : null;
      const date = rawDate ? formatDateDDMMYYYY(rawDate) : getTodayDDMMYYYY();
      const rawCertId = idC ? row[idC] : null;
      const certId = formatCertificateId(rawCertId, idx, prefix);

      // Preserve status if existing recipient with same id
      const existing = event.recipients?.[idx];

      return {
        id: idx + 1,
        name,
        email,
        date,
        certId,
        status: existing?.status || 'Ready',
        raw: row
      };
    });

    updateEvent({
      recipients: newRecipients,
      nameMode: mode,
      fullNameCol: fullCol,
      firstNameCol: firstCol,
      lastNameCol: lastCol,
      emailCol: emailC,
      dateCol: dateC,
      idCol: idC,
      certIdPrefix: prefix
    });

    addLog('Column assignments updated and recipients re-mapped.', 'info');
  };

  return (
    <section className="space-y-6">
      {/* Hidden File Inputs with onClick Reset */}
      <input
        ref={templateInputRef}
        type="file"
        id="templateFileInput"
        accept="image/*,.svg"
        className="hidden"
        onClick={e => {
          (e.target as HTMLInputElement).value = '';
        }}
        onChange={e => {
          if (e.target.files?.[0]) handleTemplateUpload(e.target.files[0]);
          e.target.value = '';
        }}
      />

      <input
        ref={excelInputRef}
        type="file"
        id="excelFileInput"
        accept=".xlsx, .xls, .csv"
        className="hidden"
        onClick={e => {
          (e.target as HTMLInputElement).value = '';
        }}
        onChange={e => {
          if (e.target.files?.[0]) handleExcelUpload(e.target.files[0]);
          e.target.value = '';
        }}
      />

      {/* Step Header with Helpful Hints */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A] tracking-tight">Step 1: Upload Assets & Map Columns</h2>
          <p className="text-xs text-[#666666] mt-0.5">
            Upload or change your certificate template and recipient spreadsheet for &quot;{event.name}&quot;.
          </p>
        </div>

        <Tooltip content="Load sample data to test all features immediately" position="left">
          <button
            type="button"
            onClick={loadSampleDataIntoCurrentEvent}
            className="w-full md:w-auto clay-btn-secondary whitespace-nowrap px-5 sm:px-6 py-2.5 text-xs font-bold text-[#D72638] text-center justify-center flex items-center gap-1.5"
          >
            <FiRefreshCw className="text-xs" />
            <span>Load Sample Data</span>
          </button>
        </Tooltip>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* ========================================================================= */}
        {/* CERTIFICATE TEMPLATE CARD                                                 */}
        {/* ========================================================================= */}
        <div className="clay-card p-6 sm:p-7 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#1A1A1A] text-base flex items-center space-x-2.5">
                <FiImage className="text-xl text-[#D72638]" />
                <span>1. Certificate Template</span>
              </h3>
              <span className={templateStatusBadge.isCustom ? 'clay-badge clay-badge-green' : 'clay-badge clay-badge-neutral'}>
                {templateStatusBadge.text}
              </span>
            </div>

            <p className="text-xs text-[#555555] font-medium leading-relaxed">
              Upload your certificate background template (PNG, JPG, SVG, WebP). You can change or replace it at any time.
            </p>

            {/* If custom template is uploaded: show live visual preview + replacement controls */}
            {hasTemplate ? (
              <div
                onDragOver={handleTemplateDragOver}
                onDragLeave={handleTemplateDragLeave}
                onDrop={handleTemplateDrop}
                className={`clay-inset p-4 space-y-3 rounded-2xl transition ${
                  isTemplateDragging ? 'ring-2 ring-[#D72638] bg-[#FDECEF]/40' : ''
                }`}
              >
                {/* Visual Image Preview */}
                <div className="w-full h-40 rounded-xl bg-[#EDE8E1] flex items-center justify-center overflow-hidden border border-[#E0DEDA] shadow-inner relative group">
                  <img
                    src={event.templateDataUrl}
                    alt={templateFileName}
                    className="w-full h-full object-contain p-1.5 rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                    <button
                      type="button"
                      onClick={() => templateInputRef.current?.click()}
                      className="clay-btn-primary px-3.5 py-1.5 text-xs font-bold flex items-center space-x-1.5 shadow-lg"
                    >
                      <FiRefreshCw className="text-xs" />
                      <span>Change Image</span>
                    </button>
                  </div>
                </div>

                {/* File Details */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="min-w-0 pr-2">
                    <p className="text-[10px] text-[#777777] font-semibold uppercase">Active File</p>
                    <p className="font-bold text-[#1A1A1A] truncate text-xs flex items-center gap-1.5">
                      <FiCheckCircle className="text-green-600 flex-shrink-0" />
                      <span className="truncate">{templateFileName}</span>
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[#D72638] bg-[#FAFAF8] px-2 py-0.5 rounded-md border border-[#E0DEDA] flex-shrink-0">
                    Custom Template
                  </span>
                </div>
              </div>
            ) : (
              /* If no custom template uploaded: tactile dropzone */
              <div
                id="dropZoneTemplate"
                onClick={() => templateInputRef.current?.click()}
                onDragOver={handleTemplateDragOver}
                onDragLeave={handleTemplateDragLeave}
                onDrop={handleTemplateDrop}
                className={`clay-inset p-7 text-center cursor-pointer hover:border-[#D72638] transition space-y-3 group w-full rounded-2xl ${
                  isTemplateDragging ? 'ring-2 ring-[#D72638] bg-[#FDECEF]/40' : ''
                }`}
              >
                <div className="clay-circle w-14 h-14 text-2xl mx-auto group-hover:scale-110 transition transform flex items-center justify-center">
                  <FiUploadCloud className="text-2xl text-[#D72638]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1A1A1A]">Click to upload template image</p>
                  <p className="text-xs text-[#777777] font-medium mt-0.5">Drag & drop PNG, JPG, or SVG here</p>
                </div>
                <div className="clay-groove w-28 mx-auto my-1"></div>
                <p className="text-[11px] text-[#666666] italic">
                  Currently using clean default certificate design
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons Bar for Template */}
          <div className="pt-3 border-t border-[#E0DEDA] flex items-center gap-2">
            <Tooltip content="Upload a new certificate template to replace the current one" position="top" className="flex-1">
              <button
                type="button"
                id="btnChangeTemplate"
                onClick={() => templateInputRef.current?.click()}
                className="w-full clay-btn-primary py-2.5 px-4 text-xs font-bold flex items-center justify-center space-x-1.5"
              >
                <FiRefreshCw className="text-xs flex-shrink-0" />
                <span>{hasTemplate ? 'Change / Replace Template' : 'Choose Template File'}</span>
              </button>
            </Tooltip>

            {hasTemplate && (
              <Tooltip content="Remove custom template and revert to the default certificate" position="top">
                <button
                  type="button"
                  id="btnRemoveTemplate"
                  onClick={handleRemoveTemplate}
                  className="clay-btn-secondary py-2.5 px-3.5 text-xs font-bold text-red-600 hover:text-red-700 flex items-center justify-center space-x-1.5"
                >
                  <FiTrash2 className="text-xs flex-shrink-0" />
                  <span>Revert to Default</span>
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* EXCEL SPREADSHEET CARD                                                    */}
        {/* ========================================================================= */}
        <div className="clay-card p-6 sm:p-7 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#1A1A1A] text-base flex items-center space-x-2.5">
                <TbFileSpreadsheet className="text-xl text-[#D72638]" />
                <span>2. Excel / CSV Recipients Sheet</span>
              </h3>
              <span className={excelStatusBadge.isLoaded ? 'clay-badge clay-badge-green' : 'clay-badge clay-badge-neutral'}>
                {excelStatusBadge.text}
              </span>
            </div>

            <p className="text-xs text-[#555555] font-medium leading-relaxed">
              Upload recipient records (.xlsx, .xls, .csv). You can change or replace the spreadsheet at any time.
            </p>

            {/* If Excel file is loaded: show rich details and summary */}
            {recipientsCount > 0 ? (
              <div
                onDragOver={handleExcelDragOver}
                onDragLeave={handleExcelDragLeave}
                onDrop={handleExcelDrop}
                className={`clay-inset p-4 space-y-3 rounded-2xl transition ${
                  isExcelDragging ? 'ring-2 ring-[#D72638] bg-[#FDECEF]/40' : ''
                }`}
              >
                {/* Header summary row */}
                <div className="flex items-center justify-between pb-2 border-b border-[#E0DEDA]">
                  <div className="min-w-0 pr-2">
                    <p className="text-[10px] text-[#777777] font-semibold uppercase">Loaded Spreadsheet</p>
                    <p className="font-bold text-[#1A1A1A] truncate text-xs flex items-center gap-1.5">
                      <FiCheckCircle className="text-green-600 flex-shrink-0" />
                      <span className="truncate">{excelFileName}</span>
                    </p>
                  </div>
                  <span className="clay-badge clay-badge-green font-mono text-[11px] font-bold flex-shrink-0">
                    {recipientsCount} Recipients
                  </span>
                </div>

                {/* Detected columns chips */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-[#555555] uppercase tracking-wider">Detected Sheet Headers:</p>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {event.availableHeaders && event.availableHeaders.length > 0 ? (
                      event.availableHeaders.map(h => (
                        <span
                          key={h}
                          className="text-[10px] bg-[#FAFAF8] px-2 py-0.5 rounded-md border border-[#E0DEDA] text-[#1A1A1A] font-bold"
                        >
                          {h}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-[#777777] italic">Standard demo columns</span>
                    )}
                  </div>
                </div>

                {/* Mapping quick status */}
                <div className="pt-2 border-t border-[#E0DEDA] flex items-center justify-between text-[11px] text-[#666666]">
                  <span>Name Column: <strong className="text-[#1A1A1A]">{event.fullNameCol || (event.nameMode === 'split' ? `${event.firstNameCol} + ${event.lastNameCol}` : 'Auto')}</strong></span>
                  <span>Email: <strong className="text-[#1A1A1A]">{event.emailCol || 'None'}</strong></span>
                </div>
              </div>
            ) : (
              /* If no Excel file loaded: tactile dropzone */
              <div
                id="dropZoneExcel"
                onClick={() => excelInputRef.current?.click()}
                onDragOver={handleExcelDragOver}
                onDragLeave={handleExcelDragLeave}
                onDrop={handleExcelDrop}
                className={`clay-inset p-7 text-center cursor-pointer hover:border-[#D72638] transition space-y-3 group w-full rounded-2xl ${
                  isExcelDragging ? 'ring-2 ring-[#D72638] bg-[#FDECEF]/40' : ''
                }`}
              >
                <div className="clay-circle w-14 h-14 text-2xl mx-auto group-hover:scale-110 transition transform flex items-center justify-center">
                  <FiFile className="text-2xl text-[#D72638]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1A1A1A]">Click to upload Excel spreadsheet</p>
                  <p className="text-xs text-[#777777] font-medium mt-0.5">Drag & drop .xlsx, .xls, or .csv here</p>
                </div>
                <div className="clay-groove w-28 mx-auto my-1"></div>
                <p className="text-[11px] text-[#666666] italic">
                  No recipients imported yet
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons Bar for Excel */}
          <div className="pt-3 border-t border-[#E0DEDA] flex items-center gap-2">
            <Tooltip content="Upload a new spreadsheet to replace or update recipients" position="top" className="flex-1">
              <button
                type="button"
                id="btnChangeExcel"
                onClick={() => excelInputRef.current?.click()}
                className="w-full clay-btn-primary py-2.5 px-4 text-xs font-bold flex items-center justify-center space-x-1.5"
              >
                <FiRefreshCw className="text-xs flex-shrink-0" />
                <span>{recipientsCount > 0 ? 'Change / Replace Sheet' : 'Choose Excel File'}</span>
              </button>
            </Tooltip>

            {recipientsCount > 0 && (
              <Tooltip content="Remove all imported recipients and reset the spreadsheet" position="top">
                <button
                  type="button"
                  id="btnClearExcel"
                  onClick={handleClearExcel}
                  className="clay-btn-secondary py-2.5 px-3.5 text-xs font-bold text-red-600 hover:text-red-700 flex items-center justify-center space-x-1.5"
                >
                  <FiTrash2 className="text-xs flex-shrink-0" />
                  <span>Clear List</span>
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Smart Detection Summary Card (Visible once Excel parsed) */}
      {isDetectionCardVisible && (
        <div id="detectionCard" className="clay-card p-6 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E0DEDA]">
            <div>
              <h4 className="font-bold text-[#1A1A1A] text-base flex items-center space-x-2">
                <FiCheck className="text-[#D72638] text-base" />
                <span>Smart Column Detection Results</span>
              </h4>
              <p className="text-xs text-[#666666] mt-0.5 font-medium">
                Columns were automatically detected. You can adjust mappings if desired.
              </p>
            </div>
            <Tooltip content="Proceed to Step 2 to position and style fields on the canvas" position="left">
              <Link
                href={`/events/${event.id}/designer`}
                className="clay-btn-primary px-6 py-2.5 text-xs font-bold flex items-center space-x-2 whitespace-nowrap"
              >
                <span>Proceed to Designer</span>
                <FiArrowRight className="text-xs" />
              </Link>
            </Tooltip>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {/* Name Column Mapping */}
            <div className="p-4 clay-inset space-y-2">
              <label className="block text-xs font-bold text-[#1A1A1A]">Recipient Name Source</label>
              <ClayDropdown
                id="mapNameMode"
                value={event.nameMode || 'single'}
                onChange={val => {
                  const newMode = val as any;
                  reapplyMapping(newMode, event.fullNameCol, event.firstNameCol, event.lastNameCol, event.emailCol, event.dateCol, event.idCol, event.rawRows);
                }}
                options={[
                  { value: 'auto', label: 'Auto-detected' },
                  { value: 'single', label: 'Single Column (Full Name)' },
                  { value: 'split', label: 'Split Columns (First + Last)' }
                ]}
              />

              {event.nameMode !== 'split' ? (
                <div id="singleNameSelectContainer" className="mt-2">
                  <ClayDropdown
                    id="mapFullNameCol"
                    value={event.fullNameCol}
                    onChange={val => {
                      reapplyMapping(event.nameMode, val, event.firstNameCol, event.lastNameCol, event.emailCol, event.dateCol, event.idCol, event.rawRows);
                    }}
                    options={event.availableHeaders.map(h => ({ value: h, label: h }))}
                  />
                </div>
              ) : (
                <div id="splitNameSelectContainer" className="mt-2 space-y-2">
                  <ClayDropdown
                    id="mapFirstNameCol"
                    value={event.firstNameCol}
                    onChange={val => {
                      reapplyMapping(event.nameMode, event.fullNameCol, val, event.lastNameCol, event.emailCol, event.dateCol, event.idCol, event.rawRows);
                    }}
                    options={event.availableHeaders.map(h => ({ value: h, label: h }))}
                  />
                  <ClayDropdown
                    id="mapLastNameCol"
                    value={event.lastNameCol}
                    onChange={val => {
                      reapplyMapping(event.nameMode, event.fullNameCol, event.firstNameCol, val, event.emailCol, event.dateCol, event.idCol, event.rawRows);
                    }}
                    options={event.availableHeaders.map(h => ({ value: h, label: h }))}
                  />
                </div>
              )}
            </div>

            {/* Email Column Mapping */}
            <div className="p-4 clay-inset space-y-2">
              <label className="block text-xs font-bold text-[#1A1A1A]">Email Address Column</label>
              <ClayDropdown
                id="mapEmailCol"
                value={event.emailCol}
                onChange={val => {
                  reapplyMapping(event.nameMode, event.fullNameCol, event.firstNameCol, event.lastNameCol, val, event.dateCol, event.idCol, event.rawRows);
                }}
                options={[
                  { value: '', label: '-- None --' },
                  ...event.availableHeaders.map(h => ({ value: h, label: h }))
                ]}
              />
              <p className="text-[10px] text-[#777777] font-medium">Used for bulk certificate email dispatch.</p>
            </div>

            {/* Date Column Mapping */}
            <div className="p-4 clay-inset space-y-2">
              <label className="block text-xs font-bold text-[#1A1A1A]">Date Column (Optional)</label>
              <ClayDropdown
                id="mapDateCol"
                value={event.dateCol}
                onChange={val => {
                  reapplyMapping(event.nameMode, event.fullNameCol, event.firstNameCol, event.lastNameCol, event.emailCol, val, event.idCol, event.rawRows);
                }}
                options={[
                  { value: '', label: '-- None / Current Date --' },
                  ...event.availableHeaders.map(h => ({ value: h, label: h }))
                ]}
              />
              <p className="text-[10px] text-[#777777] font-medium">Formatted as dd/mm/yyyy dynamically.</p>
            </div>

            {/* Certificate ID Column Mapping */}
            <div className="p-4 clay-inset space-y-2">
              <label className="block text-xs font-bold text-[#1A1A1A]">Certificate ID Source</label>
              <ClayDropdown
                id="mapIdCol"
                value={event.idCol}
                onChange={val => {
                  reapplyMapping(event.nameMode, event.fullNameCol, event.firstNameCol, event.lastNameCol, event.emailCol, event.dateCol, val, event.rawRows);
                }}
                options={[
                  { value: '', label: '-- Auto-generate Sequential IDs --' },
                  ...event.availableHeaders.map(h => ({ value: h, label: h }))
                ]}
              />

              <div className="pt-1.5 space-y-1">
                <label className="block text-[10px] font-bold text-[#555555]">ID Prefix (Customizable)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    id="inputUploadCertIdPrefix"
                    value={event.certIdPrefix ?? 'CERT-'}
                    placeholder="e.g. CERT- or HWI-"
                    onChange={e => {
                      const newPrefix = e.target.value;
                      reapplyMapping(event.nameMode, event.fullNameCol, event.firstNameCol, event.lastNameCol, event.emailCol, event.dateCol, event.idCol, event.rawRows, newPrefix);
                    }}
                    className="w-full text-xs clay-inset px-2.5 py-1.5 font-mono font-bold text-[#1A1A1A]"
                  />
                </div>
                <p className="text-[10px] text-[#777777] font-medium">
                  Prefix applied to numbers (e.g. <code>{(event.certIdPrefix ?? 'CERT-')}0007</code>).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
