import { CertificateEvent, Recipient } from '@/types';

/**
 * Reconciles recipient statuses based on dispatch logs in the event.
 * If logs show "Delivered certificate to ...", "Email sent successfully to ...",
 * or "Bulk send completed. X sent", any recipient that was delivered is updated to 'Sent'.
 */
export function reconcileSentStatusFromLogs(event: CertificateEvent): {
  updated: boolean;
  count: number;
  newRecipients: Recipient[];
} {
  if (!event.recipients || event.recipients.length === 0 || !event.logs || event.logs.length === 0) {
    return { updated: false, count: 0, newRecipients: event.recipients || [] };
  }

  const deliveredEmails = new Set<string>();
  const deliveredNames = new Set<string>();

  for (const log of event.logs) {
    const msg = log.message || '';

    // Format 1: Delivered certificate to {Name} ({email})
    const deliveredMatch = msg.match(/Delivered certificate to\s+(.*?)\s+\((.*?)\)/i);
    if (deliveredMatch) {
      if (deliveredMatch[1]) deliveredNames.add(deliveredMatch[1].trim().toLowerCase());
      if (deliveredMatch[2]) deliveredEmails.add(deliveredMatch[2].trim().toLowerCase());
      continue;
    }

    // Format 2: Email sent successfully to {email}!
    const sentMatch = msg.match(/Email sent successfully to\s+(.*?)(?:!|$)/i);
    if (sentMatch && sentMatch[1]) {
      deliveredEmails.add(sentMatch[1].trim().toLowerCase());
      continue;
    }

    // Format 3: [Simulated] Email to {email} logged successfully
    const simMatch = msg.match(/Email to\s+(.*?)\s+logged successfully/i);
    if (simMatch && simMatch[1]) {
      deliveredEmails.add(simMatch[1].trim().toLowerCase());
      continue;
    }
  }

  // Check if bulk send completed log exists with count
  let allSentFromBulk = false;
  for (const log of event.logs) {
    const match = (log.message || '').match(/Bulk send completed\.\s*(\d+)\s*sent/i);
    if (match) {
      const sentCount = Number(match[1]);
      if (sentCount >= event.recipients.length && sentCount > 0) {
        allSentFromBulk = true;
        break;
      }
    }
  }

  let changed = 0;
  const newRecipients = event.recipients.map(r => {
    if (r.status === 'Sent') return r;

    const emailNorm = (r.email || '').trim().toLowerCase();
    const nameNorm = (r.name || '').trim().toLowerCase();

    const isDelivered =
      allSentFromBulk ||
      (emailNorm && deliveredEmails.has(emailNorm)) ||
      (nameNorm && deliveredNames.has(nameNorm));

    if (isDelivered) {
      changed++;
      return { ...r, status: 'Sent' as const };
    }
    return r;
  });

  return {
    updated: changed > 0,
    count: changed,
    newRecipients
  };
}
