export interface Recipient {
  id: number;
  name: string;
  email: string;
  date?: string;
  certId?: string;
  course?: string;
  status: 'Ready' | 'Sending...' | 'Sent' | 'Failed';
  raw?: Record<string, any>;
}

export interface FieldConfig {
  label: string;
  name?: string;
  columnKey?: string; // Mapped column from Excel (e.g. "Team Name", "College")
  enabled?: boolean; // Visibility toggle on certificate
  isCustom?: boolean; // Whether this is a user-added field
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  fontFamily: string;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
  uppercase: boolean;
  customPrefix: string;
}

export type ActiveFieldKey = 'name' | 'date' | 'certId' | 'qrCode' | string;

export interface FieldsState {
  name: FieldConfig;
  date: FieldConfig;
  certId: FieldConfig;
  [key: string]: FieldConfig;
}

export interface QrCodeConfig {
  enabled: boolean;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  size: number; // in pixels (e.g. 50 - 180)
  payloadTemplate: string; // Dynamic text template (e.g. self-contained verification)
}

export interface SmtpConfig {
  mockMode: boolean;
  senderName: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface ColumnMapping {
  fullNameCol: string | null;
  firstNameCol: string | null;
  lastNameCol: string | null;
  emailCol: string | null;
  dateCol: string | null;
  certIdCol: string | null;
  courseCol: string | null;
  isSplitName: boolean;
}

export interface LogEntry {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface CertificateEvent {
  id: string; // e.g. "event-1725456000000"
  name: string; // e.g. "Global AI Summit 2026"
  createdAt: string;
  updatedAt: string;

  // Step 1: Template & Excel Data
  templateFileName: string;
  templateDataUrl: string; // Base64 data URL stored in IndexedDB
  templateWidth?: number;
  templateHeight?: number;
  excelFileName: string;
  nameMode: 'auto' | 'single' | 'split';
  fullNameCol: string;
  firstNameCol: string;
  lastNameCol: string;
  emailCol: string;
  dateCol: string;
  idCol: string;
  certIdPrefix?: string; // e.g. "CERT-" or custom prefix
  availableHeaders: string[];
  rawRows: any[];

  // Step 2 & 3: Recipients & Coordinates
  recipients: Recipient[];
  fields: FieldsState;
  selectedRecipientIndex: number;
  activeField: ActiveFieldKey;
  qrConfig?: QrCodeConfig;

  // Step 4: Email Template & Dispatch History
  emailTemplate: EmailTemplate;
  logs: LogEntry[];
}

export interface EventSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  templateFileName: string;
  excelFileName: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  hasTemplate: boolean;
}
