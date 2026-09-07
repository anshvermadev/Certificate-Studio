import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { ColumnMapping, Recipient } from '@/types';
import { formatDateDDMMYYYY } from '@/lib/date';
import { formatCertificateId } from '@/lib/cert-id';

// Intelligent Column Detection (Preserved 1:1)
function detectColumns(headers: string[]): ColumnMapping {
  const norm = (str: any) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  let fullNameCol: string | null = null;
  let firstNameCol: string | null = null;
  let lastNameCol: string | null = null;
  let emailCol: string | null = null;
  let dateCol: string | null = null;
  let certIdCol: string | null = null;
  let courseCol: string | null = null;

  for (const h of headers) {
    const n = norm(h);

    // Full name match
    if (!fullNameCol && (
      n === 'fullname' || n === 'name' || n === 'participantname' || 
      n === 'studentname' || n === 'candidatename' || n === 'membername' || 
      n === 'recipientname' || n === 'nameofparticipant' || n === 'attendee' ||
      n === 'personname' || n === 'user'
    )) {
      fullNameCol = h;
    }

    // First name match
    if (!firstNameCol && (
      n === 'firstname' || n === 'first' || n === 'givenname' || 
      n === 'fname' || n === 'forename'
    )) {
      firstNameCol = h;
    }

    // Last name match
    if (!lastNameCol && (
      n === 'lastname' || n === 'last' || n === 'surname' || 
      n === 'familyname' || n === 'lname'
    )) {
      lastNameCol = h;
    }

    // Email match
    if (!emailCol && (
      n === 'email' || n === 'emailaddress' || n === 'mail' || 
      n === 'mailid' || n === 'emailid' || n === 'recipientemail' || 
      n === 'e_mail' || n.includes('email') || n.includes('mail')
    )) {
      emailCol = h;
    }

    // Date match
    if (!dateCol && (
      n === 'date' || n === 'issuedate' || n === 'eventdate' || 
      n === 'completiondate' || n.includes('date')
    )) {
      dateCol = h;
    }

    // Certificate ID match
    if (!certIdCol && (
      n === 'certid' || n === 'certificateid' || n === 'id' || 
      n === 'certno' || n === 'regno' || n === 'registrationno' || 
      n === 'rollno' || n === 'serialno' || n === 'credentialid'
    )) {
      certIdCol = h;
    }

    // Course / Event match
    if (!courseCol && (
      n === 'course' || n === 'coursename' || n === 'event' || 
      n === 'program' || n === 'workshop' || n === 'title' || 
      n === 'training' || n === 'subject'
    )) {
      courseCol = h;
    }
  }

  const preferSplit = (!fullNameCol || norm(fullNameCol) === 'name') && !!firstNameCol && !!lastNameCol;

  return {
    fullNameCol: preferSplit ? null : fullNameCol,
    firstNameCol: preferSplit ? firstNameCol : (fullNameCol ? null : firstNameCol),
    lastNameCol: preferSplit ? lastNameCol : (fullNameCol ? null : lastNameCol),
    emailCol,
    dateCol,
    certIdCol,
    courseCol,
    isSplitName: preferSplit || (!fullNameCol && !!(firstNameCol && lastNameCol))
  };
}

// Format Name cleanly (Preserved 1:1)
function formatName(str: any): string {
  if (!str) return '';
  return String(str)
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// Security: Check for prototype-polluting key names
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function sanitizeObjectKeys(obj: Record<string, any>): Record<string, any> {
  const safe: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    const cleanKey = String(key || '').trim();
    if (!cleanKey || DANGEROUS_KEYS.has(cleanKey.toLowerCase())) continue;
    // Cap string length per field to prevent memory abuse
    safe[cleanKey] = typeof val === 'string' ? val.slice(0, 1000) : val;
  }
  return safe;
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_ROWS = 10000; // 10,000 recipients maximum per batch
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('excel') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No Excel/CSV file uploaded' }, { status: 400 });
    }

    // Security check 1: File size ceiling
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds safety limit of 25MB (Received: ${(file.size / (1024 * 1024)).toFixed(1)}MB)` },
        { status: 413 }
      );
    }

    // Security check 2: File extension verification
    const fileName = file.name || '';
    const lowerFileName = fileName.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some(ext => lowerFileName.endsWith(ext));
    if (!hasValidExt) {
      return NextResponse.json(
        { error: 'Invalid file format. Only .xlsx, .xls, and .csv files are supported.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return NextResponse.json({ error: 'The uploaded spreadsheet contains no sheets.' }, { status: 400 });
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rawData || rawData.length === 0) {
      return NextResponse.json({ error: 'The uploaded file contains no data rows.' }, { status: 400 });
    }

    // Security check 3: Row count limit
    if (rawData.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `File contains ${rawData.length} rows, which exceeds the maximum safe limit of ${MAX_ROWS} rows.` },
        { status: 400 }
      );
    }

    // Security check 4: Sanitize headers and filter prototype pollution
    const rawHeaders = Object.keys(rawData[0]);
    const headers = rawHeaders.filter(h => {
      const clean = String(h || '').trim();
      return clean.length > 0 && !DANGEROUS_KEYS.has(clean.toLowerCase());
    });

    const detected = detectColumns(headers);

    // Build normalized recipient list with sanitized row objects
    const recipients: Recipient[] = rawData.map((rawRow, index) => {
      const row = sanitizeObjectKeys(rawRow);
      let resolvedName = '';

      if (detected.isSplitName && detected.firstNameCol && detected.lastNameCol) {
        const first = String(row[detected.firstNameCol] || '').trim();
        const last = String(row[detected.lastNameCol] || '').trim();
        resolvedName = [first, last].filter(Boolean).join(' ');
      } else if (detected.fullNameCol) {
        resolvedName = String(row[detected.fullNameCol] || '').trim();
      } else if (detected.firstNameCol) {
        resolvedName = String(row[detected.firstNameCol] || '').trim();
      } else {
        const candidate = headers.find(h => h !== detected.emailCol && typeof row[h] === 'string' && String(row[h]).trim().length > 0);
        resolvedName = candidate ? String(row[candidate]).trim() : `Recipient ${index + 1}`;
      }

      resolvedName = formatName(resolvedName);
      const email = detected.emailCol ? String(row[detected.emailCol] || '').trim() : '';
      const date = formatDateDDMMYYYY(detected.dateCol ? row[detected.dateCol] : null);
      const rawCertId = detected.certIdCol ? row[detected.certIdCol] : null;
      const certId = formatCertificateId(rawCertId, index, 'CERT-');
      const course = detected.courseCol ? String(row[detected.courseCol] || '').trim() : '';

      return {
        id: index + 1,
        name: resolvedName,
        email: email,
        date: date,
        certId: certId,
        course: course,
        status: 'Ready',
        raw: row
      };
    });

    return NextResponse.json({
      success: true,
      headers,
      detectedMapping: detected,
      recipients,
      totalCount: recipients.length,
      filename: fileName
    });

  } catch (err: any) {
    console.error('Excel parse error:', err);
    return NextResponse.json({ error: 'Failed to parse Excel/CSV spreadsheet securely.' }, { status: 500 });
  }
}
