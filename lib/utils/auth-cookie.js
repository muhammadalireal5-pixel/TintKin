/**
 * Sets the __session cookie on the client side with proper flags.
 * @param {string} token
 * @param {number} [maxAge=3600] - Cookie lifetime in seconds (default 1 hour)
 */
export function setSessionCookie(token, maxAge = 3600) {
  if (typeof document === 'undefined') return;
  const secureFlag = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `__session=${token}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`;
}

/**
 * Clears the __session cookie on the client side.
 */
export function clearSessionCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = '__session=; path=/; max-age=0; SameSite=Lax';
}
