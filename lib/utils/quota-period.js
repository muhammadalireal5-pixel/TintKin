/**
 * Resolves which usage period a request counts against.
 *
 * Period keys come from a client-supplied timezone, and local dates differ by
 * up to a day across zones. A request whose key is *older* than the stored one
 * therefore still counts against the stored (newer) period; otherwise
 * alternating timezones (e.g. UTC+14 and UTC-12) would reset the counter on
 * every request. Keys are zero-padded "YYYY-MM-DD" / "YYYY-MM", so string order
 * equals date order.
 *
 * @param {string|undefined|null} storedKey
 * @param {number|undefined|null} storedCount
 * @param {string} requestedKey
 * @returns {{ key: string, count: number }}
 */
export function resolvePeriod(storedKey, storedCount, requestedKey) {
  if (storedKey && requestedKey < storedKey) {
    return { key: storedKey, count: storedCount || 0 };
  }
  return { key: requestedKey, count: storedKey === requestedKey ? storedCount || 0 : 0 };
}
