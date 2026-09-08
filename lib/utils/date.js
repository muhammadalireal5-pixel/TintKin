/**
 * Formats a date string or timestamp to a clean display string (e.g. "Jan 15, 2026").
 * @param {string|Date|number|null} dateString
 * @returns {string}
 */
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  } catch {
    return 'N/A';
  }
}

/**
 * Returns human-readable relative time string (e.g. "5m ago", "3h ago", "2d ago").
 * @param {string|Date|number|null} dateString
 * @returns {string}
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return 'Unknown';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Unknown';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${diffDays}d ago`;
  } catch {
    return 'Unknown';
  }
}

/**
 * Gets the start of the current day (midnight) in a specific timezone.
 * @param {string} timezone - e.g. "UTC", "America/New_York"
 * @param {Date} [reference=new Date()]
 * @returns {Date}
 */
export function getLocalDayStart(timezone, reference = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const formattedDate = formatter.format(reference);
  const [mm, dd, yyyy] = formattedDate.split('/');
  
  const tzDate = new Date(reference.toLocaleString('en-US', { timeZone: timezone }));
  tzDate.setHours(0, 0, 0, 0);
  const diff = reference.getTime() - new Date(reference.toLocaleString('en-US', { timeZone: timezone })).getTime();
  return new Date(tzDate.getTime() + diff);
}

/**
 * Gets the start of the week (Monday midnight) in a specific timezone.
 * @param {string} timezone
 * @returns {Date}
 */
export function getLocalISOWeekStart(timezone) {
  const todayStart = getLocalDayStart(timezone);
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' });
  const weekdayStr = formatter.format(todayStart);

  /** @type {Record<string, number>} */
  const dayOffsets = { Sun: 6, Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5 };
  const offset = dayOffsets[weekdayStr] || 0;

  return new Date(todayStart.getTime() - offset * 24 * 60 * 60 * 1000);
}

/**
 * Gets the start of the month and number of days in the month for a timezone.
 * @param {string} timezone
 * @param {Date} [reference=new Date()]
 * @returns {{ monthStart: Date, daysInMonth: number }}
 */
export function getLocalMonthStart(timezone, reference = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.format(reference).split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const firstDay = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  const monthStart = getLocalDayStart(timezone, firstDay);
  const daysInMonth = new Date(year, month, 0).getDate();
  return { monthStart, daysInMonth };
}

/**
 * Computes Monday midnight for an arbitrary date.
 * @param {Date|string|number} date
 * @returns {Date}
 */
export function getISOWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day + 1);
  return d;
}
