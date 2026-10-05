/** A new skin report unlocks after this many analyzed scans since the last report. */
export const SCANS_PER_REPORT = 7;

/**
 * Progress toward the next report.
 * @param {number} scansSinceLastReport
 * @returns {{ ready: boolean, count: number, required: number, remaining: number }}
 */
export function getReportProgress(scansSinceLastReport) {
  const scans = Math.max(0, Number(scansSinceLastReport) || 0);
  return {
    ready: scans >= SCANS_PER_REPORT,
    count: Math.min(scans, SCANS_PER_REPORT),
    required: SCANS_PER_REPORT,
    remaining: Math.max(0, SCANS_PER_REPORT - scans),
  };
}
