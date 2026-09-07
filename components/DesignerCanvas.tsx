'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Recipient, FieldsState, ActiveFieldKey, QrCodeConfig, FieldConfig } from '@/types';
import ClayDropdown, { DropdownGroup } from './ClayDropdown';
import Tooltip from './Tooltip';
import { formatDateDDMMYYYY, getTodayDDMMYYYY } from '@/lib/date';
import { generateQrDataUrl, buildQrPayload } from '@/lib/qr';
import { downloadCertificatePdf } from '@/lib/pdf';
import { 
  FiCrosshair, 
  FiInfo, 
  FiEdit3, 
  FiChevronUp, 
  FiChevronDown, 
  FiChevronLeft, 
  FiChevronRight, 
  FiFileText, 
  FiImage,
  FiPlus,
  FiTrash2,
  FiEye,
  FiEyeOff,
  FiCheck
} from 'react-icons/fi';
import { TbArrowsHorizontal, TbArrowsVertical, TbRulerMeasure, TbQrcode } from 'react-icons/tb';

interface DesignerCanvasProps {
  templateImage: HTMLImageElement | null;
  recipients: Recipient[];
  selectedRecipientIndex: number;
  setSelectedRecipientIndex: (idx: number) => void;
  activeField: ActiveFieldKey;
  setActiveField: (field: ActiveFieldKey) => void;
  fields: FieldsState;
  setFields: React.Dispatch<React.SetStateAction<FieldsState>>;
  availableHeaders?: string[];
  qrConfig?: QrCodeConfig;
  onUpdateQrConfig?: (newQr: QrCodeConfig) => void;
  eventName?: string;
  onLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

const FONT_GROUPS: DropdownGroup[] = [
  {
    groupLabel: 'Calligraphy & Script',
    options: [
      { value: "'Great Vibes', cursive", label: 'Great Vibes (Elegant Calligraphy)', fontFamily: "'Great Vibes', cursive" },
      { value: "'Alex Brush', cursive", label: 'Alex Brush (Flowing Script)', fontFamily: "'Alex Brush', cursive" },
      { value: "'Parisienne', cursive", label: 'Parisienne (Romantic Script)', fontFamily: "'Parisienne', cursive" },
      { value: "'Tangerine', cursive", label: 'Tangerine (Royal Script)', fontFamily: "'Tangerine', cursive" }
    ]
  },
  {
    groupLabel: 'Classic Formal Serif',
    options: [
      { value: "'Cinzel', serif", label: 'Cinzel (Regal Roman)', fontFamily: "'Cinzel', serif" },
      { value: "'Cinzel Decorative', serif", label: 'Cinzel Decorative (Ornate)', fontFamily: "'Cinzel Decorative', serif" },
      { value: "'Playfair Display', serif", label: 'Playfair Display (Editorial)', fontFamily: "'Playfair Display', serif" }
    ]
  },
  {
    groupLabel: 'Modern Sans-Serif',
    options: [
      { value: "'Montserrat', sans-serif", label: 'Montserrat (Clean Geometric)', fontFamily: "'Montserrat', sans-serif" },
      { value: "'Roboto', sans-serif", label: 'Roboto (Technical Sans)', fontFamily: "'Roboto', sans-serif" },
      { value: "'Inter', sans-serif", label: 'Inter (UI Sans)', fontFamily: "'Inter', sans-serif" }
    ]
  }
];

export default function DesignerCanvas({
  templateImage,
  recipients,
  selectedRecipientIndex,
  setSelectedRecipientIndex,
  activeField,
  setActiveField,
  fields,
  setFields,
  availableHeaders = [],
  qrConfig,
  onUpdateQrConfig,
  eventName = 'Certificate Event',
  onLog
}: DesignerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHoveringField, setIsHoveringField] = useState(false);
  const [dragTargetField, setDragTargetField] = useState<ActiveFieldKey | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const qrImageRef = useRef<HTMLImageElement | null>(null);

  // Popover state for adding Excel fields
  const [showAddFieldMenu, setShowAddFieldMenu] = useState(false);
  const [customInputText, setCustomInputText] = useState('');

  // Fallback and responsive local QR config state
  const [localQrConfig, setLocalQrConfig] = useState<QrCodeConfig>(() => qrConfig || {
    enabled: true,
    x: 88,
    y: 84,
    size: 110,
    payloadTemplate: "VERIFIED CERTIFICATE\nID: {id}\nRecipient: {name}\nEvent: {event}\nDate: {date}\nStatus: Verified Authentic"
  });

  // Keep localQrConfig in sync if parent passes updated qrConfig
  useEffect(() => {
    if (qrConfig) {
      setLocalQrConfig(qrConfig);
    }
  }, [qrConfig]);

  const isQrActive = activeField === 'qrCode';

  const activeFieldConfig: FieldConfig = fields[activeField] || {
    name: isQrActive ? 'QR Code' : activeField,
    label: isQrActive ? 'Verification QR Code' : activeField,
    x: isQrActive ? localQrConfig.x : 50,
    y: isQrActive ? localQrConfig.y : 50,
    fontSize: 24,
    fontFamily: "'Montserrat', sans-serif",
    color: '#1A1A1A',
    align: 'center',
    bold: false,
    italic: false,
    uppercase: false,
    customPrefix: '',
    enabled: true
  };

  const currentRecipient: Recipient = recipients[selectedRecipientIndex] || {
    id: 1,
    name: 'Alexander James Vance',
    email: 'alexander.vance@example.com',
    date: getTodayDDMMYYYY(),
    certId: 'CERT-2026-001',
    course: 'Advanced AI & Data Engineering',
    status: 'Ready',
    raw: {
      'Full Name': 'Alexander James Vance',
      'Email': 'alexander.vance@example.com',
      'Issue Date': getTodayDDMMYYYY(),
      'Certificate ID': 'CERT-2026-001',
      'Team Name': 'Neural Pioneers',
      'College': 'Institute of Advanced Studies',
      'Rank': '1st Runner Up'
    }
  };

  // Helper to extract a display value for any field key
  const getFieldValue = useCallback((fieldKey: string, r: Recipient): string => {
    const f = fields[fieldKey];
    if (!f) return '';

    if (fieldKey === 'name') return r.name || '';
    if (fieldKey === 'date') return formatDateDDMMYYYY(r.date);
    if (fieldKey === 'certId') return r.certId || `CERT-${String(r.id || 1).padStart(4, '0')}`;

    const col = f.columnKey || f.name || fieldKey;

    // Direct check in recipient.raw
    if (r.raw && r.raw[col] !== undefined && r.raw[col] !== null && String(r.raw[col]).trim() !== '') {
      return String(r.raw[col]);
    }

    // Case-insensitive lookup in raw
    if (r.raw) {
      const match = Object.keys(r.raw).find(k => k.trim().toLowerCase() === col.trim().toLowerCase());
      if (match && r.raw[match] !== undefined && r.raw[match] !== null && String(r.raw[match]).trim() !== '') {
        return String(r.raw[match]);
      }
    }

    // Direct lookup in recipient fields (course, etc.)
    if ((r as any)[col] !== undefined && (r as any)[col] !== null && String((r as any)[col]).trim() !== '') {
      return String((r as any)[col]);
    }

    // Fallback contextual preview values if raw data isn't loaded
    const low = col.toLowerCase();
    if (low.includes('team')) return 'Team Alpha Pioneers';
    if (low.includes('college') || low.includes('univ') || low.includes('inst')) return 'Institute of Technology';
    if (low.includes('rank') || low.includes('pos')) return '1st Runner Up';
    if (low.includes('score') || low.includes('mark')) return '96 / 100';
    if (low.includes('course') || low.includes('track')) return r.course || 'AI & Machine Learning';

    return f.label || col;
  }, [fields]);

  // Main canvas draw routine
  const drawCanvas = useCallback((recipientOverride?: Recipient, showSelectionIndicator: boolean = true) => {
    const canvas = canvasRef.current;
    if (!canvas || !templateImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const r = recipientOverride || currentRecipient;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);

    // Draw all text fields (both core and custom Excel columns)
    const fieldKeys = Object.keys(fields);

    fieldKeys.forEach(key => {
      const f = fields[key];
      if (!f || f.enabled === false) return;

      let textVal = getFieldValue(key, r);
      if (f.customPrefix) textVal = f.customPrefix + textVal;
      if (f.uppercase) textVal = textVal.toUpperCase();

      const posX = (f.x / 100) * canvas.width;
      const posY = (f.y / 100) * canvas.height;

      let fontStyle = '';
      if (f.italic) fontStyle += 'italic ';
      if (f.bold) fontStyle += 'bold ';
      ctx.font = `${fontStyle}${f.fontSize}px ${f.fontFamily}`;
      ctx.fillStyle = f.color;
      ctx.textAlign = f.align || 'center';
      ctx.textBaseline = 'middle';

      ctx.fillText(textVal, posX, posY);

      if (showSelectionIndicator && key === activeField) {
        const metrics = ctx.measureText(textVal);
        const textWidth = metrics.width || 100;
        const textHeight = f.fontSize * 1.2;

        let boxX = posX;
        if (f.align === 'center') boxX = posX - textWidth / 2;
        else if (f.align === 'right') boxX = posX - textWidth;

        ctx.save();
        ctx.strokeStyle = '#D72638';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(boxX - 8, posY - textHeight / 2 - 4, textWidth + 16, textHeight + 8);
        ctx.restore();
      }
    });

    // Draw Verification QR Code on Canvas if enabled
    if (localQrConfig.enabled && qrImageRef.current) {
      const qrW = ((localQrConfig.size || 110) / 1000) * canvas.width;
      const qrH = qrW;
      const qrX = (localQrConfig.x / 100) * canvas.width - qrW / 2;
      const qrY = (localQrConfig.y / 100) * canvas.height - qrH / 2;
      const pad = Math.max(qrW * 0.05, 4);

      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).beginPath();
        (ctx as any).roundRect(qrX - pad, qrY - pad, qrW + pad * 2, qrH + pad * 2, pad);
        (ctx as any).fill();
      } else {
        ctx.fillRect(qrX - pad, qrY - pad, qrW + pad * 2, qrH + pad * 2);
      }

      ctx.drawImage(qrImageRef.current, qrX, qrY, qrW, qrH);

      // Selection box for QR Code
      if (showSelectionIndicator && activeField === 'qrCode') {
        ctx.strokeStyle = '#D72638';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(qrX - pad - 4, qrY - pad - 4, qrW + pad * 2 + 8, qrH + pad * 2 + 8);
      }
      ctx.restore();
    }
  }, [templateImage, fields, activeField, localQrConfig, currentRecipient, getFieldValue]);

  // Generate QR Code image for canvas whenever payload, size, or recipient changes
  useEffect(() => {
    let isMounted = true;
    if (!localQrConfig.enabled) {
      qrImageRef.current = null;
      drawCanvas();
      return;
    }

    const payload = buildQrPayload(
      localQrConfig.payloadTemplate,
      currentRecipient,
      eventName,
      fields
    );

    // High resolution render for crisp canvas display
    const qrPixelResolution = Math.max(Math.round((localQrConfig.size || 110) * 2.5), 160);

    generateQrDataUrl(payload, qrPixelResolution)
      .then(dataUrl => {
        if (!isMounted) return;
        if (dataUrl) {
          const img = new Image();
          img.onload = () => {
            if (!isMounted) return;
            qrImageRef.current = img;
            drawCanvas();
          };
          img.src = dataUrl;
        }
      })
      .catch(err => {
        console.error('Failed to generate preview QR code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [
    localQrConfig.enabled,
    localQrConfig.size,
    localQrConfig.payloadTemplate,
    selectedRecipientIndex,
    eventName,
    fields,
    drawCanvas,
    currentRecipient
  ]);

  useEffect(() => {
    if (templateImage && canvasRef.current) {
      canvasRef.current.width = templateImage.naturalWidth || 1920;
      canvasRef.current.height = templateImage.naturalHeight || 1080;
      drawCanvas();
    }
  }, [templateImage, fields, selectedRecipientIndex, activeField, localQrConfig, drawCanvas]);

  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (clientX - rect.left) * scaleX;
    const clickY = (clientY - rect.top) * scaleY;

    const pctX = Math.max(0, Math.min(100, Math.round((clickX / canvas.width) * 100)));
    const pctY = Math.max(0, Math.min(100, Math.round((clickY / canvas.height) * 100)));

    return { pctX, pctY };
  };

  const getFieldAtCoords = (clickX: number, clickY: number): ActiveFieldKey | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Check QR code hit first if enabled
    if (localQrConfig.enabled) {
      const qrW = ((localQrConfig.size || 110) / 1000) * canvas.width;
      const qrH = qrW;
      const qrX = (localQrConfig.x / 100) * canvas.width - qrW / 2;
      const qrY = (localQrConfig.y / 100) * canvas.height - qrH / 2;
      const pad = Math.max(qrW * 0.05, 10);

      if (
        clickX >= qrX - pad &&
        clickX <= qrX + qrW + pad &&
        clickY >= qrY - pad &&
        clickY <= qrY + qrH + pad
      ) {
        return 'qrCode';
      }
    }

    const r = currentRecipient;
    const allKeys = Object.keys(fields).filter(k => fields[k]?.enabled !== false);
    
    // Check in order: activeField first if in fields, then others
    const fieldKeys: string[] = [
      ...(activeField !== 'qrCode' && fields[activeField] ? [activeField] : []),
      ...allKeys.filter(k => k !== activeField)
    ];

    for (const key of fieldKeys) {
      const f = fields[key];
      if (!f || f.enabled === false) continue;

      let textVal = getFieldValue(key, r);
      if (f.customPrefix) textVal = f.customPrefix + textVal;
      if (f.uppercase) textVal = textVal.toUpperCase();

      const posX = (f.x / 100) * canvas.width;
      const posY = (f.y / 100) * canvas.height;

      let fontStyle = '';
      if (f.italic) fontStyle += 'italic ';
      if (f.bold) fontStyle += 'bold ';
      ctx.font = `${fontStyle}${f.fontSize}px ${f.fontFamily}`;

      const metrics = ctx.measureText(textVal);
      const textWidth = Math.max(metrics.width || 80, 80);
      const textHeight = Math.max(f.fontSize * 1.3, 30);

      let boxX = posX;
      if (f.align === 'center') boxX = posX - textWidth / 2;
      else if (f.align === 'right') boxX = posX - textWidth;
      const boxY = posY - textHeight / 2;

      const padX = Math.max(20, f.fontSize * 0.3);
      const padY = Math.max(16, f.fontSize * 0.3);

      if (
        clickX >= boxX - padX &&
        clickX <= boxX + textWidth + padX &&
        clickY >= boxY - padY &&
        clickY <= boxY + textHeight + padY
      ) {
        return key;
      }
    }

    return null;
  };

  const updatePosition = (fieldKey: ActiveFieldKey, pctX: number, pctY: number, logMsg = false) => {
    if (fieldKey === 'qrCode') {
      const updated = { ...localQrConfig, x: pctX, y: pctY };
      setLocalQrConfig(updated);
      onUpdateQrConfig?.(updated);
      if (logMsg) {
        onLog(`Moved Verification QR Code to (${pctX}%, ${pctY}%)`, 'info');
      }
      return;
    }

    setFields(prev => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        x: pctX,
        y: pctY
      }
    }));

    if (logMsg) {
      const label = fields[fieldKey]?.label || fields[fieldKey]?.name || fieldKey;
      onLog(`Moved field "${label}" to (${pctX}%, ${pctY}%)`, 'info');
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const hit = getFieldAtCoords(clickX, clickY);

    if (hit) {
      if (hit !== activeField) {
        setActiveField(hit);
      }
      setDragTargetField(hit);
      dragStartRef.current = { x: e.clientX, y: e.clientY, moved: false };
      setIsDragging(true);
    } else {
      setDragTargetField(activeField);
      dragStartRef.current = { x: e.clientX, y: e.clientY, moved: true };
      setIsDragging(true);
      const pctX = Math.max(0, Math.min(100, Math.round((clickX / canvas.width) * 100)));
      const pctY = Math.max(0, Math.min(100, Math.round((clickY / canvas.height) * 100)));
      updatePosition(activeField, pctX, pctY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && dragTargetField) {
      if (dragStartRef.current) {
        const dist = Math.hypot(e.clientX - dragStartRef.current.x, e.clientY - dragStartRef.current.y);
        if (dist > 4) {
          dragStartRef.current.moved = true;
        }
      }
      const coords = getCanvasCoords(e.clientX, e.clientY);
      if (coords && dragStartRef.current?.moved) {
        updatePosition(dragTargetField, coords.pctX, coords.pctY);
      }
    } else {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;
        const hit = getFieldAtCoords(clickX, clickY);
        setIsHoveringField(hit !== null);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setIsDragging(false);
      if (dragTargetField && dragStartRef.current?.moved) {
        const coords = getCanvasCoords(e.clientX, e.clientY);
        if (coords) {
          updatePosition(dragTargetField, coords.pctX, coords.pctY, true);
        }
      }
      setDragTargetField(null);
      dragStartRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragTargetField(null);
      dragStartRef.current = null;
    }
    setIsHoveringField(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (touch.clientX - rect.left) * scaleX;
    const clickY = (touch.clientY - rect.top) * scaleY;

    const hit = getFieldAtCoords(clickX, clickY);

    if (hit) {
      if (hit !== activeField) {
        setActiveField(hit);
      }
      setDragTargetField(hit);
      dragStartRef.current = { x: touch.clientX, y: touch.clientY, moved: false };
      setIsDragging(true);
    } else {
      setDragTargetField(activeField);
      dragStartRef.current = { x: touch.clientX, y: touch.clientY, moved: true };
      setIsDragging(true);
      const pctX = Math.max(0, Math.min(100, Math.round((clickX / canvas.width) * 100)));
      const pctY = Math.max(0, Math.min(100, Math.round((clickY / canvas.height) * 100)));
      updatePosition(activeField, pctX, pctY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragTargetField || e.touches.length === 0) return;
    const touch = e.touches[0];
    if (dragStartRef.current) {
      const dist = Math.hypot(touch.clientX - dragStartRef.current.x, touch.clientY - dragStartRef.current.y);
      if (dist > 4) {
        dragStartRef.current.moved = true;
      }
    }
    const coords = getCanvasCoords(touch.clientX, touch.clientY);
    if (coords && dragStartRef.current?.moved) {
      updatePosition(dragTargetField, coords.pctX, coords.pctY);
    }
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragTargetField(null);
      dragStartRef.current = null;
    }
  };

  const updateActiveField = (updates: Partial<FieldConfig>) => {
    if (isQrActive) return;
    setFields(prev => ({
      ...prev,
      [activeField]: {
        ...prev[activeField],
        ...updates
      }
    }));
  };

  // QR Size updater with immediate local state and validation
  const handleUpdateQrSize = (newSize: number) => {
    const clamped = Math.max(15, Math.min(250, Math.round(newSize)));
    const updated = { ...localQrConfig, size: clamped };
    setLocalQrConfig(updated);
    onUpdateQrConfig?.(updated);
  };

  // Update general QR config properties
  const updateQrConfig = (partial: Partial<QrCodeConfig>) => {
    const updated = { ...localQrConfig, ...partial };
    setLocalQrConfig(updated);
    onUpdateQrConfig?.(updated);
  };

  // Add custom Excel field
  const addCustomExcelField = (columnName: string) => {
    const trimmed = columnName.trim();
    if (!trimmed) return;

    const cleanSlug = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newKey = `custom_${cleanSlug}_${Date.now().toString().slice(-4)}`;

    const newFieldConfig: FieldConfig = {
      name: trimmed,
      label: trimmed,
      columnKey: trimmed,
      isCustom: true,
      enabled: true,
      x: 50,
      y: 62,
      fontSize: 26,
      fontFamily: "'Montserrat', sans-serif",
      color: '#1A1A1A',
      align: 'center',
      bold: true,
      italic: false,
      uppercase: false,
      customPrefix: ''
    };

    setFields(prev => ({
      ...prev,
      [newKey]: newFieldConfig
    }));

    setActiveField(newKey);
    setShowAddFieldMenu(false);
    setCustomInputText('');
    onLog(`Added field "${trimmed}" from Excel spreadsheet.`, 'success');
  };

  // Universal Field Deletion & Visibility Control
  const handleDeleteField = (keyToDelete: string) => {
    if (keyToDelete === 'name') {
      onLog('Recipient Name cannot be deleted as it is required on the certificate.', 'warning');
      return;
    }

    // Core fields: toggle visibility
    if (keyToDelete === 'date' || keyToDelete === 'certId') {
      const fieldTitle = keyToDelete === 'date' ? 'Issue Date' : 'Certificate ID';
      const currentlyEnabled = fields[keyToDelete]?.enabled !== false;
      setFields(prev => ({
        ...prev,
        [keyToDelete]: {
          ...prev[keyToDelete],
          enabled: !currentlyEnabled
        }
      }));
      onLog(
        currentlyEnabled
          ? `Removed "${fieldTitle}" from certificate (Hidden).`
          : `Restored "${fieldTitle}" to certificate.`,
        'info'
      );
      return;
    }

    // Custom fields: permanently delete
    const f = fields[keyToDelete];
    const label = f?.label || f?.name || keyToDelete;

    setFields(prev => {
      const next = { ...prev };
      delete next[keyToDelete];
      return next;
    });

    if (activeField === keyToDelete) {
      setActiveField('name');
    }
    onLog(`Deleted field "${label}" from certificate.`, 'success');
  };

  // Support keyboard Delete / Backspace key to delete selected field
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).isContentEditable
      );
      if (isTyping) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeField && activeField !== 'name' && activeField !== 'qrCode') {
          e.preventDefault();
          handleDeleteField(activeField);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeField, fields]);

  // Download test PDF
  const handleDownloadPdf = async () => {
    try {
      await downloadCertificatePdf(
        currentRecipient,
        templateImage,
        fields,
        localQrConfig,
        eventName
      );
      onLog(`Downloaded high-res test PDF for ${currentRecipient.name}`, 'success');
    } catch (err: any) {
      onLog(`Failed to generate PDF: ${err.message}`, 'error');
    }
  };

  // Download test PNG
  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    drawCanvas(currentRecipient, false);
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    drawCanvas(currentRecipient, true);

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Certificate-${(currentRecipient.name || 'Sample').replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    a.click();
    onLog(`Downloaded PNG: ${a.download}`, 'success');
  };

  const recipientOptions = recipients.map((r, idx) => ({
    value: String(idx),
    label: `${r.name} (${r.email || 'No email'})`
  }));

  // List of custom fields currently defined
  const customFieldKeys = useMemo(() => {
    return Object.keys(fields).filter(
      k => k !== 'name' && k !== 'date' && k !== 'certId'
    );
  }, [fields]);

  // Unused headers from uploaded spreadsheet
  const unmappedHeaders = useMemo(() => {
    const existingKeys = new Set(
      Object.values(fields)
        .map(f => (f.columnKey || f.name || '').toLowerCase().trim())
        .filter(Boolean)
    );
    existingKeys.add('name');
    existingKeys.add('full name');
    existingKeys.add('email');
    existingKeys.add('date');
    existingKeys.add('cert id');
    existingKeys.add('certificate id');
    existingKeys.add('id');

    return (availableHeaders || []).filter(h => {
      const norm = h.toLowerCase().trim();
      return !existingKeys.has(norm);
    });
  }, [availableHeaders, fields]);

  const activeFieldLabel = isQrActive
    ? 'Verification QR Code'
    : activeField === 'name'
      ? 'Recipient Name'
      : activeField === 'date'
        ? 'Issue Date'
        : activeField === 'certId'
          ? 'Certificate ID'
          : (fields[activeField]?.label || fields[activeField]?.name || activeField);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 xl:gap-4 items-start">
      {/* ========================================================================= */}
      {/* COLUMN 1: ACTIVE FIELDS, TYPOGRAPHY & QR SETTINGS (LEFT, 3 cols / 25%)     */}
      {/* ========================================================================= */}
      <div className="lg:col-span-3 order-3 lg:order-1 space-y-3">
        {/* Active Field Selector Card */}
        <div className="clay-card p-3 sm:p-3.5 space-y-2.5 relative z-20 [&:has([data-dropdown-open='true'])]:z-50">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#1A1A1A] text-xs flex items-center space-x-1.5">
              <FiCrosshair className="text-[#D72638] text-sm" />
              <span>Active Fields</span>
            </h3>
            <Tooltip content="Click directly on the canvas or use sliders on the right" position="top">
              <span className="text-[10px] text-[#D72638] font-bold cursor-help underline decoration-dotted">
                Tap to move
              </span>
            </Tooltip>
          </div>

          {/* Field Selector Pills Container */}
          <div className="flex flex-wrap gap-1.5">
            {/* Name */}
            <Tooltip content="Reposition and style recipient's name" position="top">
              <button
                type="button"
                onClick={() => setActiveField('name')}
                className={`py-1.5 px-2.5 text-[11px] font-bold transition rounded-xl flex items-center gap-1 ${
                  activeField === 'name' ? 'clay-btn-primary' : 'clay-btn-secondary'
                }`}
              >
                <span>Name</span>
              </button>
            </Tooltip>

            {/* Date */}
            <div
              className={`inline-flex items-center rounded-xl transition ${
                activeField === 'date' ? 'clay-btn-primary' : 'clay-btn-secondary'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveField('date')}
                className="py-1.5 pl-2.5 pr-1.5 text-[11px] font-bold flex items-center gap-1"
              >
                <span>Date</span>
                {fields.date?.enabled === false && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-[#E0DEDA] text-[#888888] font-normal" title="Hidden on certificate">
                    Off
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteField('date');
                }}
                className="w-4 h-4 mr-1 flex items-center justify-center rounded text-[#888888] hover:text-[#D72638] transition"
                title={fields.date?.enabled === false ? 'Restore Date' : 'Hide Date from certificate'}
              >
                {fields.date?.enabled === false ? <FiEyeOff className="text-[10px]" /> : <FiTrash2 className="text-[10px]" />}
              </button>
            </div>

            {/* Cert ID */}
            <div
              className={`inline-flex items-center rounded-xl transition ${
                activeField === 'certId' ? 'clay-btn-primary' : 'clay-btn-secondary'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveField('certId')}
                className="py-1.5 pl-2.5 pr-1.5 text-[11px] font-bold flex items-center gap-1"
              >
                <span>Cert ID</span>
                {fields.certId?.enabled === false && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-[#E0DEDA] text-[#888888] font-normal" title="Hidden on certificate">
                    Off
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteField('certId');
                }}
                className="w-4 h-4 mr-1 flex items-center justify-center rounded text-[#888888] hover:text-[#D72638] transition"
                title={fields.certId?.enabled === false ? 'Restore Cert ID' : 'Hide Cert ID from certificate'}
              >
                {fields.certId?.enabled === false ? <FiEyeOff className="text-[10px]" /> : <FiTrash2 className="text-[10px]" />}
              </button>
            </div>

            {/* Dynamic Custom Excel Fields with Direct Delete Action */}
            {customFieldKeys.map(key => {
              const cf = fields[key];
              const isSelected = activeField === key;
              return (
                <div
                  key={key}
                  className={`inline-flex items-center rounded-xl transition ${
                    isSelected ? 'clay-btn-primary' : 'clay-btn-secondary'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveField(key)}
                    className="py-1.5 pl-2.5 pr-1 text-[11px] font-bold truncate max-w-[105px]"
                    title={cf.label || cf.name || key}
                  >
                    {cf.label || cf.name || key}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteField(key);
                    }}
                    className="w-5 h-5 mr-1 flex items-center justify-center rounded-lg text-[#888888] hover:bg-[#D72638] hover:text-white transition flex-shrink-0"
                    title={`Delete field "${cf.label || cf.name || key}"`}
                    aria-label={`Delete ${cf.label || cf.name || key}`}
                  >
                    <FiTrash2 className="text-[11px]" />
                  </button>
                </div>
              );
            })}

            {/* Verification QR Code Pill */}
            <button
              type="button"
              onClick={() => setActiveField('qrCode')}
              className={`py-1.5 px-2.5 text-[11px] font-bold transition rounded-xl flex items-center gap-1.5 ${
                activeField === 'qrCode' ? 'clay-btn-primary' : 'clay-btn-secondary'
              }`}
            >
              <TbQrcode className="text-xs text-[#D72638]" />
              <span>QR Code</span>
              {localQrConfig.enabled ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="QR Enabled" />
              ) : (
                <span className="text-[9px] px-1 py-0.2 rounded bg-[#E0DEDA] text-[#888888] font-normal" title="QR Disabled">
                  Off
                </span>
              )}
            </button>
          </div>

          {/* + Add Field from Excel Dropdown & Button */}
          <div className="pt-1.5 relative">
            <button
              type="button"
              id="btnAddExcelField"
              onClick={() => setShowAddFieldMenu(!showAddFieldMenu)}
              className="w-full py-1.5 px-2 text-[11px] font-bold rounded-xl border border-dashed border-[#D72638] text-[#D72638] hover:bg-[#D72638]/5 transition flex items-center justify-center gap-1.5"
            >
              <FiPlus className="text-xs" />
              <span>+ Add Field from Excel</span>
            </button>

            {/* Popover Menu */}
            {showAddFieldMenu && (
              <div className="absolute left-0 right-0 mt-1.5 p-2.5 bg-[#F6F4EE] border border-[#E0DEDA] rounded-2xl shadow-xl z-50 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-[#E0DEDA]">
                  <span className="text-[10px] font-bold text-[#1A1A1A] uppercase tracking-wider">
                    Select Excel Column
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddFieldMenu(false)}
                    className="text-[10px] font-bold text-[#888888] hover:text-[#1A1A1A]"
                  >
                    Close
                  </button>
                </div>

                {/* Available Unmapped Headers */}
                {unmappedHeaders.length > 0 ? (
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-[#777777]">Detected in spreadsheet:</span>
                    <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pr-1">
                      {unmappedHeaders.map(col => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => addCustomExcelField(col)}
                          className="px-2 py-1 text-[10px] font-bold rounded-lg bg-white border border-[#E0DEDA] hover:border-[#D72638] hover:text-[#D72638] shadow-sm transition truncate max-w-full"
                        >
                          + {col}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-[#777777]">Suggested Columns:</span>
                    <div className="flex flex-wrap gap-1">
                      {['Team Name', 'College', 'Rank', 'Score', 'Track'].map(col => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => addCustomExcelField(col)}
                          className="px-2 py-1 text-[10px] font-bold rounded-lg bg-white border border-[#E0DEDA] hover:border-[#D72638] hover:text-[#D72638] shadow-sm transition"
                        >
                          + {col}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom input */}
                <div className="pt-1.5 border-t border-[#E0DEDA] space-y-1">
                  <span className="text-[9px] font-bold text-[#777777]">Or type custom column header:</span>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="e.g. Project Title, Grade..."
                      value={customInputText}
                      onChange={e => setCustomInputText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          addCustomExcelField(customInputText);
                        }
                      }}
                      className="flex-1 text-[11px] clay-inset px-2 py-1 font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => addCustomExcelField(customInputText)}
                      disabled={!customInputText.trim()}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-xl clay-btn-primary disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preview Recipient Switcher */}
          <div className="pt-2 border-t border-[#E0DEDA] space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold text-[#1A1A1A]">Sample Recipient:</label>
              <Tooltip content="Cycle through recipients to test lengths and preview all Excel data" position="left">
                <span className="text-[11px] text-[#888888] cursor-help inline-flex items-center"><FiInfo /></span>
              </Tooltip>
            </div>
            <ClayDropdown
              id="previewRecipientSelect"
              value={String(selectedRecipientIndex)}
              onChange={val => setSelectedRecipientIndex(Number(val))}
              options={recipientOptions}
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CONDITIONAL SETTINGS: QR CODE SETTINGS vs TYPOGRAPHY & STYLING           */}
        {/* ========================================================================= */}
        {isQrActive ? (
          /* Verification QR Code Settings Card */
          <div className="clay-card p-3 sm:p-3.5 space-y-3 relative z-10">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#E0DEDA]">
              <h4 className="font-bold text-[#1A1A1A] text-xs flex items-center space-x-1.5">
                <TbQrcode className="text-[#D72638] text-base" />
                <span>Verification QR Code</span>
              </h4>
              <button
                type="button"
                id="btnToggleQrCode"
                onClick={() => updateQrConfig({ enabled: !localQrConfig.enabled })}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-xl transition flex items-center gap-1.5 ${
                  localQrConfig.enabled ? 'bg-emerald-600 text-white shadow-sm' : 'clay-btn-secondary text-[#777777]'
                }`}
              >
                {localQrConfig.enabled ? <FiCheck className="text-xs" /> : null}
                <span>{localQrConfig.enabled ? 'Enabled' : 'Disabled'}</span>
              </button>
            </div>

            {/* Self-contained / No domain explanation badge */}
            <div className="p-2.5 bg-[#FAFAF8] rounded-xl border border-[#E0DEDA] text-[11px] text-[#555555] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#1A1A1A]">
                <FiInfo className="text-[#D72638] flex-shrink-0 text-xs" />
                <span>Self-Contained Verification (No Domain)</span>
              </div>
              <p className="leading-tight text-[10px] text-[#666666]">
                Scanning this QR code with any standard smartphone camera or Google Lens directly displays certificate details and authenticity card without redirecting or pinging any external website.
              </p>
            </div>

            {/* QR Code Size Controls: Range 15px - 250px with Steppers & Presets */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-[#1A1A1A]">
                <span className="text-[11px]">QR Code Size:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="15"
                    max="250"
                    value={localQrConfig.size}
                    onChange={e => handleUpdateQrSize(Number(e.target.value))}
                    className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold text-[#D72638] clay-inset text-center"
                  />
                  <span className="text-[10px] text-[#777777]">px</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleUpdateQrSize(Math.max(15, localQrConfig.size - 5))}
                  className="px-2 py-1 text-[10px] font-bold clay-btn-secondary rounded-lg hover:text-[#D72638]"
                  title="Decrease size by 5px"
                >
                  -5
                </button>
                <input
                  type="range"
                  id="inputQrSize"
                  min="15"
                  max="250"
                  step="1"
                  value={localQrConfig.size}
                  onChange={e => handleUpdateQrSize(Number(e.target.value))}
                  className="flex-1 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateQrSize(Math.min(250, localQrConfig.size + 5))}
                  className="px-2 py-1 text-[10px] font-bold clay-btn-secondary rounded-lg hover:text-[#D72638]"
                  title="Increase size by 5px"
                >
                  +5
                </button>
              </div>

              {/* Quick Size Presets */}
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                <span className="text-[9px] font-bold text-[#777777] mr-0.5">Presets:</span>
                {[
                  { label: 'XS (35px)', size: 35 },
                  { label: 'S (55px)', size: 55 },
                  { label: 'M (85px)', size: 85 },
                  { label: 'Standard (110px)', size: 110 },
                  { label: 'L (160px)', size: 160 }
                ].map(preset => (
                  <button
                    key={preset.size}
                    type="button"
                    onClick={() => handleUpdateQrSize(preset.size)}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md transition ${
                      localQrConfig.size === preset.size
                        ? 'bg-[#D72638] text-white shadow-sm'
                        : 'bg-[#EDE8E1] text-[#555555] hover:bg-[#E0DEDA]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Verification Payload Template */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#1A1A1A]">Scanned Verification Text</label>
                <span className="text-[10px] text-[#777777]">Customizable</span>
              </div>
              <textarea
                rows={5}
                id="inputQrPayloadTemplate"
                value={localQrConfig.payloadTemplate}
                onChange={e => updateQrConfig({ payloadTemplate: e.target.value })}
                className="w-full text-[10px] sm:text-[11px] clay-inset p-2 font-mono leading-relaxed"
                placeholder="VERIFIED CERTIFICATE&#10;ID: {id}&#10;Recipient: {name}&#10;Event: {event}&#10;Date: {date}"
              />

              {/* Quick Placeholder Insert Buttons */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-[#777777]">Click to insert placeholder tag:</span>
                <div className="flex flex-wrap gap-1">
                  {['{name}', '{id}', '{date}', '{event}', ...customFieldKeys.map(k => `{${fields[k]?.columnKey || fields[k]?.name || k}}`)].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const current = localQrConfig.payloadTemplate || '';
                        updateQrConfig({
                          payloadTemplate: current + (current ? '\n' : '') + tag
                        });
                      }}
                      className="px-1.5 py-0.5 text-[9px] font-mono bg-[#EDE8E1] hover:bg-[#D72638] hover:text-white rounded text-[#1A1A1A] transition"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Typography & Styling Card for Text Fields */
          <div className="clay-card p-3 sm:p-3.5 space-y-2.5 relative z-10 [&:has([data-dropdown-open='true'])]:z-50">
            <div className="pb-1.5 border-b border-[#E0DEDA] flex items-center justify-between gap-1">
              <span className="flex items-center space-x-1.5 font-bold text-[#1A1A1A] text-xs">
                <FiEdit3 className="text-[#D72638] text-sm flex-shrink-0" />
                <span>Typography</span>
              </span>
              
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-[#D72638] font-bold bg-[#FAFAF8] px-1.5 py-0.5 rounded-full border border-[#E0DEDA] truncate max-w-[100px]">
                  {activeFieldLabel}
                </span>

                {/* Delete / Remove button right in the header for any non-name field */}
                {activeField !== 'name' && (
                  <button
                    type="button"
                    onClick={() => handleDeleteField(activeField)}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-lg text-red-600 bg-red-50 hover:bg-red-600 hover:text-white border border-red-200 transition flex items-center gap-1 shadow-sm"
                    title={activeField === 'date' || activeField === 'certId' ? 'Hide / Remove from Certificate' : 'Delete Field'}
                  >
                    <FiTrash2 className="text-[10px]" />
                    <span>{activeField === 'date' || activeField === 'certId' ? (fields[activeField]?.enabled !== false ? 'Hide' : 'Restore') : 'Delete'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Core Field Visibility Banners for Date & Cert ID */}
            {(activeField === 'date' || activeField === 'certId') && (
              <div className="p-2 bg-[#FAFAF8] rounded-xl border border-[#E0DEDA] flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-bold text-[#1A1A1A]">
                    Print {activeField === 'date' ? 'Date' : 'ID'} on Certificate
                  </div>
                  <div className="text-[10px] text-[#777777]">
                    {fields[activeField]?.enabled !== false ? 'Currently visible on certificate' : 'Hidden from certificate'}
                  </div>
                </div>
                <button
                  type="button"
                  id={`btnToggleVisibility_${activeField}`}
                  onClick={() => handleDeleteField(activeField)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-xl transition flex items-center gap-1 ${
                    fields[activeField]?.enabled !== false ? 'clay-btn-primary' : 'clay-btn-secondary text-[#777777]'
                  }`}
                >
                  {fields[activeField]?.enabled !== false ? <FiEye className="text-xs" /> : <FiEyeOff className="text-xs" />}
                  <span>{fields[activeField]?.enabled !== false ? 'Visible' : 'Hidden'}</span>
                </button>
              </div>
            )}

            {/* Custom Excel Field Meta & Removal Action */}
            {activeFieldConfig.isCustom && (
              <div className="p-2 bg-[#FAFAF8] rounded-xl border border-[#E0DEDA] flex items-center justify-between gap-2">
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-[#777777] block">Excel Column</span>
                  <span className="text-[11px] font-bold text-[#D72638]">{activeFieldConfig.columnKey || activeFieldConfig.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteField(activeField)}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg text-red-600 bg-red-50 hover:bg-red-600 hover:text-white transition flex items-center gap-1 border border-red-200 shadow-sm"
                >
                  <FiTrash2 className="text-xs" />
                  <span>Delete Field</span>
                </button>
              </div>
            )}

            {/* Font Family with Clay Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="block text-[11px] font-bold text-[#1A1A1A]">Font Family</label>
                <Tooltip content="Select calligraphy, formal serif, or clean sans-serif" position="left">
                  <span className="text-[11px] text-[#888888] cursor-help inline-flex items-center"><FiInfo /></span>
                </Tooltip>
              </div>
              <ClayDropdown
                id="inputFontFamily"
                value={activeFieldConfig.fontFamily}
                onChange={val => updateActiveField({ fontFamily: val })}
                groups={FONT_GROUPS}
                isFontSelector={true}
              />
            </div>

            {/* Font Size & Color Row */}
            <div className="grid grid-cols-2 gap-2 items-center">
              <div>
                <div className="flex justify-between items-center mb-0.5">
                  <label className="text-[11px] font-bold text-[#1A1A1A]">
                    Size: <span className="text-[#D72638] font-mono">{activeFieldConfig.fontSize}px</span>
                  </label>
                </div>
                <input
                  type="range"
                  id="inputFontSize"
                  min="14"
                  max="140"
                  value={activeFieldConfig.fontSize}
                  onChange={e => updateActiveField({ fontSize: Number(e.target.value) })}
                  className="w-full cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1A1A1A] mb-0.5">Color</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="color"
                    id="inputFontColor"
                    value={activeFieldConfig.color}
                    onChange={e => updateActiveField({ color: e.target.value })}
                    className="w-6 h-6 rounded-lg border border-white p-0.5 cursor-pointer bg-[#FAFAF8] shadow-sm flex-shrink-0"
                  />
                  <div className="flex space-x-0.5">
                    {[
                      { color: '#1A1A1A', label: 'Black' },
                      { color: '#D72638', label: 'Theme Red' },
                      { color: '#916B0D', label: 'Formal Gold' },
                      { color: '#881337', label: 'Crimson' }
                    ].map(swatch => (
                      <Tooltip key={swatch.color} content={swatch.label} position="top">
                        <button
                          type="button"
                          onClick={() => updateActiveField({ color: swatch.color })}
                          style={{ backgroundColor: swatch.color }}
                          className="w-5 h-5 rounded-md border border-white shadow-sm transition hover:scale-110 active:scale-95"
                        />
                      </Tooltip>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Text Alignment Row */}
            <div className="pt-1.5 border-t border-[#E0DEDA] space-y-1">
              <label className="block text-[11px] font-bold text-[#1A1A1A]">Alignment</label>
              <div className="grid grid-cols-3 gap-1.5">
                <Tooltip content="Align Left" position="top">
                  <button
                    type="button"
                    id="btnAlignLeft"
                    onClick={() => updateActiveField({ align: 'left' })}
                    className={`w-full py-1.5 text-xs font-bold rounded-xl transition text-center flex items-center justify-center ${
                      activeFieldConfig.align === 'left'
                        ? 'clay-btn-primary'
                        : 'clay-btn-secondary'
                    }`}
                  >
                    Left
                  </button>
                </Tooltip>

                <Tooltip content="Align Center" position="top">
                  <button
                    type="button"
                    id="btnAlignCenter"
                    onClick={() => updateActiveField({ align: 'center' })}
                    className={`w-full py-1.5 text-xs font-bold rounded-xl transition text-center flex items-center justify-center ${
                      activeFieldConfig.align === 'center'
                        ? 'clay-btn-primary'
                        : 'clay-btn-secondary'
                    }`}
                  >
                    Center
                  </button>
                </Tooltip>

                <Tooltip content="Align Right" position="top">
                  <button
                    type="button"
                    id="btnAlignRight"
                    onClick={() => updateActiveField({ align: 'right' })}
                    className={`w-full py-1.5 text-xs font-bold rounded-xl transition text-center flex items-center justify-center ${
                      activeFieldConfig.align === 'right'
                        ? 'clay-btn-primary'
                        : 'clay-btn-secondary'
                    }`}
                  >
                    Right
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Text Style Row */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#1A1A1A]">Style</label>
              <div className="grid grid-cols-3 gap-1.5">
                <Tooltip content="Toggle Bold" position="top">
                  <button
                    type="button"
                    id="btnToggleBold"
                    onClick={() => updateActiveField({ bold: !activeFieldConfig.bold })}
                    className={`w-full py-1.5 text-xs font-bold rounded-xl transition text-center flex items-center justify-center ${
                      activeFieldConfig.bold
                        ? 'clay-btn-primary'
                        : 'clay-btn-secondary'
                    }`}
                  >
                    <span className="font-extrabold">Bold</span>
                  </button>
                </Tooltip>

                <Tooltip content="Toggle Italic" position="top">
                  <button
                    type="button"
                    id="btnToggleItalic"
                    onClick={() => updateActiveField({ italic: !activeFieldConfig.italic })}
                    className={`w-full py-1.5 text-xs italic font-serif rounded-xl transition text-center flex items-center justify-center ${
                      activeFieldConfig.italic
                        ? 'clay-btn-primary'
                        : 'clay-btn-secondary'
                    }`}
                  >
                    <span>Italic</span>
                  </button>
                </Tooltip>

                <Tooltip content="Convert to ALL CAPS" position="top">
                  <button
                    type="button"
                    id="btnToggleUppercase"
                    onClick={() => updateActiveField({ uppercase: !activeFieldConfig.uppercase })}
                    className={`w-full py-1.5 text-xs font-bold rounded-xl transition text-center flex items-center justify-center ${
                      activeFieldConfig.uppercase
                        ? 'clay-btn-primary'
                        : 'clay-btn-secondary'
                    }`}
                  >
                    <span>CAPS</span>
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Custom Prefix */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="block text-[11px] font-bold text-[#1A1A1A]">Prefix (Optional)</label>
              </div>
              <input
                type="text"
                id="inputCustomText"
                value={activeFieldConfig.customPrefix || ''}
                placeholder="e.g. ID: or Team: "
                onChange={e => updateActiveField({ customPrefix: e.target.value })}
                className="w-full text-xs clay-inset p-2 font-semibold"
              />
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* COLUMN 2: ENLARGED CERTIFICATE PREVIEW (CENTER, 6 cols / 50%)              */}
      {/* ========================================================================= */}
      <div className="lg:col-span-6 order-1 lg:order-2 space-y-2">
        {/* Compact Resolution & Tip Bar */}
        <div className="flex items-center justify-between clay-card px-3.5 py-1.5 text-xs font-semibold gap-2">
          <span className="text-[#555555] flex items-center gap-1.5 text-[11px] sm:text-xs truncate">
            <FiInfo className="text-[#D72638] flex-shrink-0" />
            <span>Click any text or QR code to select, or drag directly on certificate.</span>
          </span>
          <Tooltip content="Template image resolution (Width x Height)" position="left">
            <span className="font-mono text-[#D72638] font-bold cursor-help text-[11px] flex-shrink-0" id="canvasResolutionDisplay">
              {templateImage ? `${templateImage.naturalWidth} × ${templateImage.naturalHeight} px` : '1920 × 1080 px'}
            </span>
          </Tooltip>
        </div>

        {/* Tactile Inset Canvas Container (Enlarged Preview without scrollbar) */}
        <div className="canvas-wrapper p-2.5 sm:p-3 flex items-center justify-center max-h-[380px] overflow-hidden select-none">
          <canvas
            ref={canvasRef}
            id="certCanvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`w-auto h-auto max-w-full max-h-[360px] rounded-xl sm:rounded-2xl transition object-contain select-none touch-none ${
              isDragging ? 'cursor-grabbing' : isHoveringField ? 'cursor-pointer' : 'cursor-crosshair'
            }`}
          />
        </div>

        {/* Live Coordinate Status Chip under Canvas */}
        <div className="flex items-center justify-between clay-card px-3.5 py-1.5 text-xs font-semibold">
          <span className="text-[#555555] flex items-center gap-1.5 truncate">
            <FiCrosshair className="text-[#D72638]" />
            <span className="text-[#1A1A1A] font-bold">Selected:</span>
            <span className="text-[#D72638] font-bold">{activeFieldLabel}</span>
          </span>
          <span className="font-mono text-[11px] text-[#1A1A1A] font-bold bg-[#EDE8E1] px-2 py-0.5 rounded-lg shadow-inner flex-shrink-0">
            X: {isQrActive ? localQrConfig.x : activeFieldConfig.x}% • Y: {isQrActive ? localQrConfig.y : activeFieldConfig.y}%
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COLUMN 3: POSITION SLIDERS & FINE CONTROLS (RIGHT, 3 cols / 25%)           */}
      {/* ========================================================================= */}
      <div className="lg:col-span-3 order-2 lg:order-3 space-y-3">
        {/* Position & Placement Controls Card */}
        <div className="clay-card p-3 sm:p-3.5 space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#E0DEDA]">
            <h3 className="font-bold text-[#1A1A1A] text-xs flex items-center space-x-1.5">
              <TbRulerMeasure className="text-[#D72638] text-sm" />
              <span>Position Controls</span>
            </h3>
            <span className="text-[10px] font-mono font-bold text-[#D72638] bg-[#FAFAF8] px-2 py-0.5 rounded-full border border-[#E0DEDA]">
              {isQrActive ? localQrConfig.x : activeFieldConfig.x}%, {isQrActive ? localQrConfig.y : activeFieldConfig.y}%
            </span>
          </div>

          {/* Horizontal (X) Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#1A1A1A] font-bold">
              <span className="text-[11px]">Horizontal (X):</span>
              <span id="coordXDisplay" className="font-mono text-[#D72638] font-bold text-xs">
                {isQrActive ? localQrConfig.x : activeFieldConfig.x}%
              </span>
            </div>
            <Tooltip content="Slide to move horizontally (0% left to 100% right)" position="top" className="w-full">
              <input
                type="range"
                id="inputCoordX"
                min="0"
                max="100"
                value={isQrActive ? localQrConfig.x : activeFieldConfig.x}
                onChange={e => updatePosition(activeField, Number(e.target.value), isQrActive ? localQrConfig.y : activeFieldConfig.y)}
                className="w-full cursor-pointer"
              />
            </Tooltip>
          </div>

          {/* Vertical (Y) Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#1A1A1A] font-bold">
              <span className="text-[11px]">Vertical (Y):</span>
              <span id="coordYDisplay" className="font-mono text-[#D72638] font-bold text-xs">
                {isQrActive ? localQrConfig.y : activeFieldConfig.y}%
              </span>
            </div>
            <Tooltip content="Slide to move vertically (0% top to 100% bottom)" position="top" className="w-full">
              <input
                type="range"
                id="inputCoordY"
                min="0"
                max="100"
                value={isQrActive ? localQrConfig.y : activeFieldConfig.y}
                onChange={e => updatePosition(activeField, isQrActive ? localQrConfig.x : activeFieldConfig.x, Number(e.target.value))}
                className="w-full cursor-pointer"
              />
            </Tooltip>
          </div>

          {/* Quick Centering Buttons */}
          <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[#E0DEDA]">
            <Tooltip content="Center horizontally at 50%" position="top">
              <button
                type="button"
                onClick={() => updatePosition(activeField, 50, isQrActive ? localQrConfig.y : activeFieldConfig.y, true)}
                className="clay-btn-secondary w-full py-1.5 text-[11px] font-bold rounded-xl flex items-center justify-center space-x-1 hover:text-[#D72638] transition"
              >
                <TbArrowsHorizontal className="text-xs" />
                <span>Center X</span>
              </button>
            </Tooltip>
            <Tooltip content="Center vertically at 50%" position="top">
              <button
                type="button"
                onClick={() => updatePosition(activeField, isQrActive ? localQrConfig.x : activeFieldConfig.x, 50, true)}
                className="clay-btn-secondary w-full py-1.5 text-[11px] font-bold rounded-xl flex items-center justify-center space-x-1 hover:text-[#D72638] transition"
              >
                <TbArrowsVertical className="text-xs" />
                <span>Center Y</span>
              </button>
            </Tooltip>
          </div>

          {/* Micro-Nudge D-Pad (1% adjustment per click) */}
          <div className="pt-1.5 border-t border-[#E0DEDA] space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#1A1A1A]">Micro-Nudge</label>
              <span className="text-[10px] text-[#777777] font-semibold">±1% per tap</span>
            </div>
            <div className="flex flex-col items-center gap-1 py-0.5">
              <Tooltip content="Nudge Up 1%" position="top">
                <button
                  type="button"
                  onClick={() => {
                    const curY = isQrActive ? localQrConfig.y : activeFieldConfig.y;
                    const curX = isQrActive ? localQrConfig.x : activeFieldConfig.x;
                    updatePosition(activeField, curX, Math.max(0, curY - 1), true);
                  }}
                  className="clay-btn-secondary w-9 h-6.5 rounded-lg font-bold text-xs flex items-center justify-center hover:text-[#D72638] transition active:scale-95 shadow-sm"
                >
                  <FiChevronUp className="text-xs" />
                </button>
              </Tooltip>
              <div className="flex items-center gap-1.5">
                <Tooltip content="Nudge Left 1%" position="left">
                  <button
                    type="button"
                    onClick={() => {
                      const curY = isQrActive ? localQrConfig.y : activeFieldConfig.y;
                      const curX = isQrActive ? localQrConfig.x : activeFieldConfig.x;
                      updatePosition(activeField, Math.max(0, curX - 1), curY, true);
                    }}
                    className="clay-btn-secondary w-9 h-6.5 rounded-lg font-bold text-xs flex items-center justify-center hover:text-[#D72638] transition active:scale-95 shadow-sm"
                  >
                    <FiChevronLeft className="text-xs" />
                  </button>
                </Tooltip>
                <span className="w-7 h-6 rounded-md bg-[#EDE8E1] shadow-inner text-[9px] font-mono font-bold text-[#777777] flex items-center justify-center">
                  1%
                </span>
                <Tooltip content="Nudge Right 1%" position="right">
                  <button
                    type="button"
                    onClick={() => {
                      const curY = isQrActive ? localQrConfig.y : activeFieldConfig.y;
                      const curX = isQrActive ? localQrConfig.x : activeFieldConfig.x;
                      updatePosition(activeField, Math.min(100, curX + 1), curY, true);
                    }}
                    className="clay-btn-secondary w-9 h-6.5 rounded-lg font-bold text-xs flex items-center justify-center hover:text-[#D72638] transition active:scale-95 shadow-sm"
                  >
                    <FiChevronRight className="text-xs" />
                  </button>
                </Tooltip>
              </div>
              <Tooltip content="Nudge Down 1%" position="bottom">
                <button
                  type="button"
                  onClick={() => {
                    const curY = isQrActive ? localQrConfig.y : activeFieldConfig.y;
                    const curX = isQrActive ? localQrConfig.x : activeFieldConfig.x;
                    updatePosition(activeField, curX, Math.min(100, curY + 1), true);
                  }}
                  className="clay-btn-secondary w-9 h-6.5 rounded-lg font-bold text-xs flex items-center justify-center hover:text-[#D72638] transition active:scale-95 shadow-sm"
                >
                  <FiChevronDown className="text-xs" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Quick Test Download Buttons */}
        <div className="clay-card p-2.5 sm:p-3 space-y-1.5">
          <label className="block text-[11px] font-bold text-[#1A1A1A]">Quick Preview Test</label>
          <div className="grid grid-cols-2 gap-1.5">
            <Tooltip content="Generate and download single high-res PDF with QR & custom fields" position="top">
              <button
                type="button"
                id="btnDownloadCurrentPdf"
                onClick={handleDownloadPdf}
                className="w-full py-2 clay-btn-dark font-bold text-[11px] rounded-xl flex items-center justify-center space-x-1.5 transition"
              >
                <FiFileText className="text-xs" />
                <span>Test PDF</span>
              </button>
            </Tooltip>

            <Tooltip content="Download current view as PNG" position="top">
              <button
                type="button"
                id="btnDownloadCurrentPng"
                onClick={handleDownloadPng}
                className="w-full py-2 clay-btn-secondary font-bold text-[11px] rounded-xl flex items-center justify-center space-x-1.5 hover:text-[#D72638] transition"
              >
                <FiImage className="text-xs" />
                <span>Test PNG</span>
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
