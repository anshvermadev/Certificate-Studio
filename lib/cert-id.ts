/**
 * Helper to format certificate IDs with a consistent prefix and zero-padding.
 * Handles:
 * - Empty / null: generates sequential ID: e.g. CERT-0001
 * - Raw integers (e.g. 7, 20): formats as CERT-0007, CERT-0020
 * - Existing alphanumeric codes (e.g. HWI-101, CERT-2026-003): preserves them
 */
export function formatCertificateId(
  rawVal: any,
  index: number,
  prefix: string = 'CERT-',
  padDigits: number = 4
): string {
  const cleanPrefix = prefix !== undefined && prefix !== null ? prefix : 'CERT-';

  // If no raw value, generate sequential ID: e.g. CERT-0001
  if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
    return `${cleanPrefix}${String(index + 1).padStart(padDigits, '0')}`;
  }

  const str = String(rawVal).trim();

  // If the value is a pure number (e.g. "7", 7, "20", etc.)
  if (/^\d+$/.test(str)) {
    const padded = str.padStart(padDigits, '0');
    return `${cleanPrefix}${padded}`;
  }

  // If it already starts with the prefix, return as is
  if (cleanPrefix && str.startsWith(cleanPrefix)) {
    return str;
  }

  // If it already has another well-formed code pattern like "ABC-123", return as is
  if (/^[a-zA-Z0-9]+[-_][a-zA-Z0-9]+$/.test(str)) {
    return str;
  }

  // Otherwise, attach prefix
  return cleanPrefix ? `${cleanPrefix}${str}` : str;
}
