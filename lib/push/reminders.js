/**
 * Pure reminder logic: which gentle nudge (if any) a person should get right
 * now. No DB, clock or network, so it is unit-tested in tests/reminders.test.mjs.
 *
 * Two slots a day, in the person's own timezone: a morning nudge and an
 * evening one. Each slot sends at most one push, and only when there is
 * something real left to do. Lapsed users (no activity for two weeks) are left
 * alone rather than nagged.
 */

export const MORNING_HOUR = 9;
export const EVENING_HOUR = 19;
export const LAPSED_AFTER_DAYS = 14;

// Stable pick per person per day, so a retry never changes the wording.
function pick(lines, seed) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return lines[h % lines.length];
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * @param {object} p
 * @param {"am"|"pm"} p.slot
 * @param {string} p.firstName
 * @param {number} p.streak          current (display) streak
 * @param {boolean} p.scannedToday
 * @param {number} p.stepsDone       routine steps ticked today
 * @param {number} p.stepsTotal      routine steps in the plan
 * @param {number} p.pmLeft          evening steps still to do
 * @param {number} p.daysSinceActive days since the last active day (0 = today)
 * @param {boolean} [p.checkInDue]   a plan check-in scan is due (the one reason to scan)
 * @param {string} p.seed            e.g. `${userId}:${dayKey}:${slot}`
 * @returns {{ title: string, body: string, url: string, tag: string } | null}
 */
export function pickReminder({ slot, firstName = "", streak = 0, scannedToday, stepsDone = 0, stepsTotal = 0, pmLeft = 0, daysSinceActive = 0, checkInDue = false, seed = "" }) {
  if (daysSinceActive > LAPSED_AFTER_DAYS) return null;
  const who = firstName ? `, ${firstName}` : "";
  const activeToday = scannedToday || stepsDone > 0;

  if (slot === "am") {
    if (activeToday) return null;
    // Skin changes slowly, so a scan is only worth a nudge when a check-in is due;
    // otherwise the morning ask is the routine, which also keeps the streak.
    if (checkInDue) {
      return {
        title: "TintKin",
        body: pick(
          [
            `Good morning${who}. Your check-in is ready. One scan shows how far your plan has taken you.`,
            `Rise and glow${who}! It's check-in day. A quick scan to see your progress.`,
          ],
          seed
        ),
        url: "/capture",
        tag: "reminder-am",
      };
    }
    const body =
      streak > 0
        ? pick(
            [
              `Good morning${who}. Your ${plural(streak, "day")} glow streak is waiting. Your morning routine keeps it shining.`,
              `Rise and glow${who}! Day ${streak + 1} is one routine step away.`,
              `Morning${who}. Your skin and your ${streak}-day streak say hello. Ready for today's steps?`,
            ],
            seed
          )
        : pick(
            [
              `Good morning${who}. A fresh day, a fresh glow. Ready for your morning routine?`,
              `Rise and shine${who}! Your plan for today is ready.`,
              `Hello${who}, your skin is awake. A few morning steps set the tone for the day.`,
            ],
            seed
          );
    return { title: "TintKin", body, url: "/routine", tag: "reminder-am" };
  }

  // Evening
  if (!scannedToday && stepsDone === 0) {
    return {
      title: "TintKin",
      body: pick(
        [
          `Evening${who}. We haven't seen you today. A single routine step still counts.`,
          `Still time to glow${who}. One routine step keeps your streak happy tonight.`,
          `Hello${who}, a tiny moment for your skin before bed? A single step is plenty.`,
        ],
        seed
      ),
      url: "/routine",
      tag: "reminder-pm",
    };
  }
  if (stepsTotal > 0 && pmLeft > 0) {
    return {
      title: "TintKin",
      body: pick(
        [
          `Your evening routine is waiting${who}. ${plural(pmLeft, "step")} to go, then sweet dreams.`,
          `Cleanse, treat, glow${who}. ${plural(pmLeft, "step")} left tonight.`,
          `Almost bedtime${who}. ${plural(pmLeft, "evening step")} and your skin tucks in happy.`,
        ],
        seed
      ),
      url: "/routine?tab=pm",
      tag: "reminder-pm",
    };
  }
  if (scannedToday && stepsTotal > 0 && stepsDone === 0) {
    return {
      title: "TintKin",
      body: pick(
        [
          `Scan done, lovely${who}. A few routine steps and today is complete.`,
          `Great scan today${who}! Your routine is the other half of the glow.`,
        ],
        seed
      ),
      url: "/routine",
      tag: "reminder-pm",
    };
  }
  return null;
}

/** Local hour (0-23) in `timezone` at `now`. */
export function localHour(timezone, now = new Date()) {
  const h = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", hourCycle: "h23" }).format(now);
  return Number(h);
}

/** Which reminder slot, if any, is due in this local hour. */
export function slotForHour(hour) {
  if (hour === MORNING_HOUR) return "am";
  if (hour === EVENING_HOUR) return "pm";
  return null;
}
