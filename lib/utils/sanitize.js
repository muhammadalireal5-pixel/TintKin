/**
 * Strips special control characters, markdown/JSON injection artifacts, and truncates text.
 * @param {string|null|undefined} str
 * @param {number} [maxLength=100]
 * @returns {string}
 */
export function sanitizeForPrompt(str, maxLength = 100) {
  if (!str || typeof str !== 'string') return '';
  const sanitized = str
    .replace(/[{}\[\]`"'<>\r\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return sanitized.slice(0, maxLength);
}
