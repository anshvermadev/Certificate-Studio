'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  CertificateEvent,
  SmtpConfig,
  EmailTemplate,
  FieldsState,
  Recipient,
  ActiveFieldKey,
  LogEntry
} from '@/types';
import {
  getEvent,
  saveEvent,
  getAllEvents,
  deleteEvent as dbDeleteEvent,
  duplicateEvent as dbDuplicateEvent,
  createDefaultEvent,
  createSampleEvent,
  setActiveEventId,
  getSmtpConfig,
  saveSmtpConfig,
  DEFAULT_SMTP_CONFIG
} from '@/lib/storage';
import { reconcileSentStatusFromLogs } from '@/lib/reconcile';

interface EventContextType {
  event: CertificateEvent | null;
  isLoading: boolean;
  templateImage: HTMLImageElement | null;
  allEvents: CertificateEvent[];
  smtpConfig: SmtpConfig;
  updateEvent: (partial: Partial<CertificateEvent> | ((prev: CertificateEvent) => Partial<CertificateEvent>)) => void;
  saveNow: () => Promise<void>;
  refreshEventsList: () => Promise<void>;
  createEvent: (name: string) => Promise<string>;
  deleteCurrentEvent: () => Promise<void>;
  duplicateCurrentEvent: () => Promise<string | null>;
  updateSmtp: (config: SmtpConfig) => Promise<void>;
  addLog: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  loadSampleDataIntoCurrentEvent: () => void;
  reconcileLogsNow: () => void;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

interface EventProviderProps {
  eventId: string;
  children: React.ReactNode;
}

export function EventProvider({ eventId, children }: EventProviderProps) {
  const router = useRouter();
  const [event, setEvent] = useState<CertificateEvent | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [allEvents, setAllEvents] = useState<CertificateEvent[]>([]);
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
  const [smtpConfig, setSmtpConfigState] = useState<SmtpConfig>(DEFAULT_SMTP_CONFIG);

  const eventRef = useRef<CertificateEvent | null>(null);
  eventRef.current = event;

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load event and SMTP config from IndexedDB
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const [loadedEvent, eventsList, savedSmtp] = await Promise.all([
          getEvent(eventId),
          getAllEvents(),
          getSmtpConfig()
        ]);

        if (!isMounted) return;

        setAllEvents(eventsList);
        setSmtpConfigState(savedSmtp);

        if (loadedEvent) {
          // Auto-reconcile sent statuses if logs show certificates were delivered
          const { updated, count, newRecipients } = reconcileSentStatusFromLogs(loadedEvent);
          if (updated) {
            loadedEvent.recipients = newRecipients;
            await saveEvent(loadedEvent);
            console.log(`[EventProvider] Automatically reconciled ${count} recipient statuses from dispatch logs.`);
          }
          setEvent(loadedEvent);
          await setActiveEventId(loadedEvent.id);
        } else {
          // If event doesn't exist, create it dynamically
          const newEvent = createDefaultEvent('My Event');
          newEvent.id = eventId;
          await saveEvent(newEvent);
          setEvent(newEvent);
          await setActiveEventId(newEvent.id);
          const updatedList = await getAllEvents();
          if (isMounted) setAllEvents(updatedList);
        }
      } catch (err) {
        console.error('[EventProvider] Error initializing event:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [eventId]);

  // Preload and cache HTMLImageElement whenever templateDataUrl changes
  useEffect(() => {
    const src = event?.templateDataUrl || '/templates/default-template.svg';

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setTemplateImage(img);
    };
    img.onerror = () => {
      console.error('[EventProvider] Failed to load template image:', src);
      setTemplateImage(null);
    };
    img.src = src;
  }, [event?.templateDataUrl]);

  // Debounced auto-save function
  const triggerAutoSave = useCallback((updated: CertificateEvent) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      await saveEvent(updated);
    }, 400);
  }, []);

  // Update partial event state
  const updateEvent = useCallback((partialOrFn: Partial<CertificateEvent> | ((prev: CertificateEvent) => Partial<CertificateEvent>)) => {
    setEvent(prev => {
      if (!prev) return null;
      const partial = typeof partialOrFn === 'function' ? partialOrFn(prev) : partialOrFn;
      const updated: CertificateEvent = {
        ...prev,
        ...partial,
        updatedAt: new Date().toISOString()
      };
      triggerAutoSave(updated);
      return updated;
    });
  }, [triggerAutoSave]);

  // Immediate save
  const saveNow = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (eventRef.current) {
      await saveEvent(eventRef.current);
    }
  }, []);

  // Add terminal log to event
  const addLog = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newLog: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      time: new Date().toLocaleTimeString(),
      message,
      type
    };

    setEvent(prev => {
      if (!prev) return null;
      const updated: CertificateEvent = {
        ...prev,
        logs: [newLog, ...(prev.logs || [])].slice(0, 150),
        updatedAt: new Date().toISOString()
      };
      triggerAutoSave(updated);
      return updated;
    });
  }, [triggerAutoSave]);

  // Refresh events list
  const refreshEventsList = useCallback(async () => {
    const list = await getAllEvents();
    setAllEvents(list);
  }, []);

  // Create new event
  const createEvent = useCallback(async (name: string): Promise<string> => {
    const newEvent = createDefaultEvent(name);
    await saveEvent(newEvent);
    await setActiveEventId(newEvent.id);
    await refreshEventsList();
    return newEvent.id;
  }, [refreshEventsList]);

  // Delete current event
  const deleteCurrentEvent = useCallback(async () => {
    if (!event) return;
    await dbDeleteEvent(event.id);
    const remaining = await getAllEvents();
    setAllEvents(remaining);
    if (remaining.length > 0) {
      router.push(`/events/${remaining[0].id}/upload`);
    } else {
      router.push('/events');
    }
  }, [event, router]);

  // Duplicate current event
  const duplicateCurrentEvent = useCallback(async (): Promise<string | null> => {
    if (!event) return null;
    const duplicated = await dbDuplicateEvent(event.id);
    if (duplicated) {
      await refreshEventsList();
      return duplicated.id;
    }
    return null;
  }, [event, refreshEventsList]);

  // Update SMTP configuration
  const updateSmtp = useCallback(async (config: SmtpConfig) => {
    setSmtpConfigState(config);
    await saveSmtpConfig(config);
  }, []);

  // Load sample data into current event
  const loadSampleDataIntoCurrentEvent = useCallback(() => {
    const sample = createSampleEvent();
    updateEvent({
      recipients: sample.recipients,
      excelFileName: sample.excelFileName,
      availableHeaders: sample.availableHeaders,
      fullNameCol: sample.fullNameCol,
      emailCol: sample.emailCol,
      dateCol: sample.dateCol,
      idCol: sample.idCol,
      nameMode: 'auto'
    });
    addLog('Sample demo recipients loaded successfully into current event.', 'success');
  }, [updateEvent, addLog]);

  // Reconcile sent statuses from dispatch activity logs on demand
  const reconcileLogsNow = useCallback(() => {
    setEvent(prev => {
      if (!prev) return null;
      const { updated, count, newRecipients } = reconcileSentStatusFromLogs(prev);
      if (updated) {
        const updatedEvent = {
          ...prev,
          recipients: newRecipients,
          updatedAt: new Date().toISOString()
        };
        triggerAutoSave(updatedEvent);
        addLog(`Synchronized ${count} sent recipients based on dispatch activity logs.`, 'success');
        return updatedEvent;
      } else {
        addLog('All recipient statuses are already synchronized with dispatch logs.', 'info');
        return prev;
      }
    });
  }, [triggerAutoSave, addLog]);

  return (
    <EventContext.Provider
      value={{
        event,
        isLoading,
        templateImage,
        allEvents,
        smtpConfig,
        updateEvent,
        saveNow,
        refreshEventsList,
        createEvent,
        deleteCurrentEvent,
        duplicateCurrentEvent,
        updateSmtp,
        addLog,
        loadSampleDataIntoCurrentEvent,
        reconcileLogsNow
      }}
    >
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
}
