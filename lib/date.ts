/**
 * Utility functions for strict 'dd/mm/yyyy' date handling.
 * Per user requirement:
 * 1. Issue date must always be formatted as dd/mm/yyyy (2-digit day / 2-digit month / 4-digit year).
 * 2. Defaults to the current local date if not specified.
 * 3. Supports calendar date picker conversion for manual addition.
 */

/**
 * Formats any date input (Date object, timestamp, date string, Excel serial number) into 'dd/mm/yyyy'.
 * Defaults to current local date if empty, null, or invalid.
 */
export function formatDateDDMMYYYY(input?: Date | string | number | null): string {
  if (!input || (typeof input === 'string' && !input.trim())) {
    return getTodayDDMMYYYY();
  }

  // If already strictly in dd/mm/yyyy format
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }
    // If in yyyy-mm-dd format (e.g. from HTML5 <input type="date">)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [yyyy, mm, dd] = trimmed.split('-');
      return `${dd}/${mm}/${yyyy}`;
    }
    // If in dd-mm-yyyy format
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      const [dd, mm, yyyy] = trimmed.split('-');
      return `${dd}/${mm}/${yyyy}`;
    }
    // Try native Date parsing
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const dd = String(parsed.getDate()).padStart(2, '0');
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const yyyy = parsed.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
    // If it's a numeric timestamp in a string
    const num = Number(trimmed);
    if (!isNaN(num) && num > 0) {
      const d = new Date(num);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      }
    }
    // If custom unparseable string, return trimmed string or fallback
    return trimmed;
  }

  if (input instanceof Date) {
    if (isNaN(input.getTime())) return getTodayDDMMYYYY();
    const dd = String(input.getDate()).padStart(2, '0');
    const mm = String(input.getMonth() + 1).padStart(2, '0');
    const yyyy = input.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  if (typeof input === 'number') {
    const d = new Date(input);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
  }

  return getTodayDDMMYYYY();
}

/**
 * Returns current local date as 'dd/mm/yyyy'.
 */
export function getTodayDDMMYYYY(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Converts 'dd/mm/yyyy' (or any date representation) to 'yyyy-mm-dd'
 * for binding with native HTML5 <input type="date" />.
 */
export function toHtmlDateInputValue(val?: string | null): string {
  if (!val || !val.trim()) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const trimmed = val.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [dd, mm, yyyy] = trimmed.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
