import { CertificateEvent, EventSummary, SmtpConfig, FieldsState, Recipient, QrCodeConfig } from '@/types';
import { getTodayDDMMYYYY } from '@/lib/date';

const DB_NAME = 'CertificateStudioDB';
const DB_VERSION = 1;
const STORE_EVENTS = 'events';
const STORE_SETTINGS = 'settings';

export const DEFAULT_FIELDS: FieldsState = {
  name: {
    label: 'Recipient Name',
    enabled: true,
    x: 50,
    y: 49,
    fontFamily: "'Great Vibes', cursive",
    fontSize: 72,
    color: '#1A1A1A',
    align: 'center',
    bold: false,
    italic: false,
    uppercase: false,
    customPrefix: ''
  },
  date: {
    label: 'Issue Date',
    enabled: true,
    x: 20,
    y: 77.5,
    fontFamily: "'Montserrat', sans-serif",
    fontSize: 22,
    color: '#1A1A1A',
    align: 'center',
    bold: true,
    italic: false,
    uppercase: false,
    customPrefix: ''
  },
  certId: {
    label: 'Certificate ID',
    enabled: true,
    x: 80,
    y: 77.5,
    fontFamily: "'Montserrat', sans-serif",
    fontSize: 20,
    color: '#1A1A1A',
    align: 'center',
    bold: true,
    italic: false,
    uppercase: false,
    customPrefix: ''
  }
};

export const DEFAULT_QR_CONFIG: QrCodeConfig = {
  enabled: true,
  x: 88,
  y: 80,
  size: 75,
  payloadTemplate: "VERIFIED CERTIFICATE\nID: {id}\nRecipient: {name}\nEvent: {event}\nDate: {date}\nStatus: Verified Authentic"
};

export const DEFAULT_SMTP_CONFIG: SmtpConfig = {
  mockMode: true,
  senderName: 'Certificate Dispatcher',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  user: '',
  pass: ''
};

export function createDefaultEvent(name: string): CertificateEvent {
  const id = `event-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const eventName = name.trim() || 'Untitled Event';

  return {
    id,
    name: eventName,
    createdAt: now,
    updatedAt: now,
    templateFileName: '',
    templateDataUrl: '',
    excelFileName: '',
    nameMode: 'auto',
    fullNameCol: '',
    firstNameCol: '',
    lastNameCol: '',
    emailCol: '',
    dateCol: '',
    idCol: '',
    certIdPrefix: 'CERT-',
    availableHeaders: [],
    rawRows: [],
    recipients: [],
    fields: JSON.parse(JSON.stringify(DEFAULT_FIELDS)),
    selectedRecipientIndex: 0,
    activeField: 'name',
    qrConfig: JSON.parse(JSON.stringify(DEFAULT_QR_CONFIG)),
    emailTemplate: {
      subject: `Your Certificate for ${eventName}`,
      body: `Dear {name},\n\nCongratulations! Please find attached your verified certificate of completion for ${eventName}.\n\nCertificate ID: {id}\nIssue Date: {date}\n\nWarm regards,\nEvent Organizing Committee`
    },
    logs: [
      {
        id: String(Date.now()),
        time: new Date().toLocaleTimeString(),
        message: `Event "${eventName}" initialized.`,
        type: 'info'
      }
    ]
  };
}

export function createSampleEvent(): CertificateEvent {
  const event = createDefaultEvent('Advanced AI & Data Engineering Bootcamp');
  const today = getTodayDDMMYYYY();
  event.recipients = [
    {
      id: 1,
      name: 'Alexander James Vance',
      email: 'alexander.vance@example.com',
      date: today,
      certId: 'CERT-2026-001',
      course: 'Advanced AI & Data Engineering',
      status: 'Ready',
      raw: {
        'Full Name': 'Alexander James Vance',
        'Email': 'alexander.vance@example.com',
        'Issue Date': today,
        'Certificate ID': 'CERT-2026-001',
        'Course': 'Advanced AI & Data Engineering',
        'Team Name': 'Neural Pioneers',
        'Rank': '1st Place Winner'
      }
    },
    {
      id: 2,
      name: 'Sophia Maria Rodriguez',
      email: 'sophia.rodriguez@example.com',
      date: today,
      certId: 'CERT-2026-002',
      course: 'Advanced AI & Data Engineering',
      status: 'Ready',
      raw: {
        'Full Name': 'Sophia Maria Rodriguez',
        'Email': 'sophia.rodriguez@example.com',
        'Issue Date': today,
        'Certificate ID': 'CERT-2026-002',
        'Course': 'Advanced AI & Data Engineering',
        'Team Name': 'Quantum Dynamics',
        'Rank': '2nd Runner Up'
      }
    },
    {
      id: 3,
      name: 'Ethan David Miller',
      email: 'ethan.miller@example.com',
      date: today,
      certId: 'CERT-2026-003',
      course: 'Advanced AI & Data Engineering',
      status: 'Ready',
      raw: {
        'Full Name': 'Ethan David Miller',
        'Email': 'ethan.miller@example.com',
        'Issue Date': today,
        'Certificate ID': 'CERT-2026-003',
        'Course': 'Advanced AI & Data Engineering',
        'Team Name': 'Algorithmic Minds',
        'Rank': 'Top 5 Finalist'
      }
    },
    {
      id: 4,
      name: 'Ananya Sharma',
      email: 'ananya.sharma@example.com',
      date: today,
      certId: 'CERT-2026-004',
      course: 'Advanced AI & Data Engineering',
      status: 'Ready',
      raw: {
        'Full Name': 'Ananya Sharma',
        'Email': 'ananya.sharma@example.com',
        'Issue Date': today,
        'Certificate ID': 'CERT-2026-004',
        'Course': 'Advanced AI & Data Engineering',
        'Team Name': 'Deep Matrix',
        'Rank': 'Honor Roll'
      }
    },
    {
      id: 5,
      name: 'Liam Noah Chen',
      email: 'liam.chen@example.com',
      date: today,
      certId: 'CERT-2026-005',
      course: 'Advanced AI & Data Engineering',
      status: 'Ready',
      raw: {
        'Full Name': 'Liam Noah Chen',
        'Email': 'liam.chen@example.com',
        'Issue Date': today,
        'Certificate ID': 'CERT-2026-005',
        'Course': 'Advanced AI & Data Engineering',
        'Team Name': 'Visionary Labs',
        'Rank': 'Merit Award'
      }
    }
  ];
  event.excelFileName = 'sample_recipients_fullname.xlsx';
  event.availableHeaders = ['Full Name', 'Email', 'Issue Date', 'Certificate ID', 'Course', 'Team Name', 'Rank'];
  event.fullNameCol = 'Full Name';
  event.emailCol = 'Email';
  event.dateCol = 'Issue Date';
  event.idCol = 'Certificate ID';
  event.logs.push({
    id: String(Date.now() + 1),
    time: new Date().toLocaleTimeString(),
    message: 'Loaded sample recipients data for demo testing.',
    type: 'success'
  });
  return event;
}

/**
 * Opens or initializes the IndexedDB database.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in current environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_EVENTS)) {
        db.createObjectStore(STORE_EVENTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves all events sorted by updatedAt descending.
 */
export async function getAllEvents(): Promise<CertificateEvent[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_EVENTS, 'readonly');
      const store = tx.objectStore(STORE_EVENTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const list: CertificateEvent[] = request.result || [];
        list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[storage] getAllEvents error:', err);
    return [];
  }
}

/**
 * Retrieves summaries of all events for lightweight dashboards.
 */
export async function getEventSummaries(): Promise<EventSummary[]> {
  const events = await getAllEvents();
  return events.map(e => ({
    id: e.id,
    name: e.name,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    templateFileName: e.templateFileName || '',
    excelFileName: e.excelFileName || '',
    totalRecipients: e.recipients?.length || 0,
    sentCount: e.recipients?.filter(r => r.status === 'Sent').length || 0,
    failedCount: e.recipients?.filter(r => r.status === 'Failed').length || 0,
    hasTemplate: Boolean(e.templateDataUrl)
  }));
}

/**
 * Retrieves a single event by ID.
 */
export async function getEvent(id: string): Promise<CertificateEvent | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_EVENTS, 'readonly');
      const store = tx.objectStore(STORE_EVENTS);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`[storage] getEvent(${id}) error:`, err);
    return null;
  }
}

/**
 * Saves or updates an event in IndexedDB.
 */
export async function saveEvent(event: CertificateEvent): Promise<void> {
  try {
    const db = await openDB();
    const updatedEvent: CertificateEvent = {
      ...event,
      updatedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_EVENTS, 'readwrite');
      const store = tx.objectStore(STORE_EVENTS);
      const request = store.put(updatedEvent);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`[storage] saveEvent(${event.id}) error:`, err);
  }
}

/**
 * Deletes an event by ID.
 */
export async function deleteEvent(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_EVENTS, 'readwrite');
      const store = tx.objectStore(STORE_EVENTS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`[storage] deleteEvent(${id}) error:`, err);
  }
}

/**
 * Duplicates an existing event with a new ID and timestamp.
 */
export async function duplicateEvent(id: string): Promise<CertificateEvent | null> {
  const original = await getEvent(id);
  if (!original) return null;

  const newId = `event-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const copy: CertificateEvent = {
    ...JSON.parse(JSON.stringify(original)),
    id: newId,
    name: `${original.name} (Copy)`,
    createdAt: now,
    updatedAt: now,
    // Reset recipient statuses to Ready
    recipients: (original.recipients || []).map(r => ({ ...r, status: 'Ready' })),
    logs: [
      {
        id: String(Date.now()),
        time: new Date().toLocaleTimeString(),
        message: `Duplicated from "${original.name}".`,
        type: 'info'
      }
    ]
  };

  await saveEvent(copy);
  return copy;
}

/**
 * Gets the last active event ID.
 */
export async function getActiveEventId(): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const request = store.get('activeEventId');

      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    return null;
  }
}

/**
 * Saves the last active event ID.
 */
export async function setActiveEventId(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readwrite');
      const store = tx.objectStore(STORE_SETTINGS);
      const request = store.put({ key: 'activeEventId', value: id });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[storage] setActiveEventId error:', err);
  }
}

/**
 * Retrieves the global SMTP configuration.
 */
export async function getSmtpConfig(): Promise<SmtpConfig> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const request = store.get('smtpConfig');

      request.onsuccess = () => resolve(request.result?.value || DEFAULT_SMTP_CONFIG);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    return DEFAULT_SMTP_CONFIG;
  }
}

/**
 * Saves the global SMTP configuration.
 */
export async function saveSmtpConfig(config: SmtpConfig): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readwrite');
      const store = tx.objectStore(STORE_SETTINGS);
      const request = store.put({ key: 'smtpConfig', value: config });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[storage] saveSmtpConfig error:', err);
  }
}
