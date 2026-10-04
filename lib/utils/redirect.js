const BASE = "https://tintkin.invalid";

/**
 * Returns `value` only if it is a same-origin relative path, else `fallback`.
 * Rejects protocol-relative ("//evil.com"), backslash and control-character
 * tricks (e.g. "/\t/evil.com", which browsers normalise to "//evil.com").
 * @param {string|null|undefined} value
 * @param {string} [fallback="/dashboard"]
 */
export function getSafeRedirect(value, fallback = "/dashboard") {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  if (/[\\\u0000-\u001F\u007F]/.test(value)) return fallback;
  try {
    const parsed = new URL(value, BASE);
    if (parsed.origin !== BASE) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
