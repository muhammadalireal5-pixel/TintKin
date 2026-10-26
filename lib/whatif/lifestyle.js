export const DEFAULT_LIFESTYLE = Object.freeze({
  sleepHours: 7,
  spfUsed: false,
  uvMinutes: 20,
  sugarServings: 3,
  smokeCigarettes: 0,
  exerciseMinutes: 80,
});

export const INPUT_KEYS = Object.freeze(['sleepHours', 'spfUsed', 'uvMinutes', 'smokeCigarettes', 'sugarServings', 'exerciseMinutes']);

export const IMPACT_KEYS = Object.freeze(['sleepHours', 'spfUsed', 'uvMinutes', 'smokeCigarettes']);

export const MIN_TRACKED_DAYS = 7;

export const INPUT_META = Object.freeze({
  sleepHours: {
    label: 'Sleep',
    options: [
      { value: 5.5, label: 'Under 6 hours' },
      { value: 6.5, label: '6 to 7 hours' },
      { value: 7.5, label: '7+ hours' },
    ],
  },
  spfUsed: {
    label: 'Daily sunscreen',
    options: [
      { value: true, label: 'Most days' },
      { value: false, label: 'Rarely' },
    ],
  },
  uvMinutes: {
    label: 'Time in the sun',
    options: [
      { value: 10, label: 'Mostly indoors' },
      { value: 25, label: 'Some time outside' },
      { value: 60, label: 'A lot outside' },
    ],
  },
  smokeCigarettes: {
    label: 'Smoking',
    options: [
      { value: 0, label: 'Non-smoker' },
      { value: 10, label: 'Smoker' },
    ],
  },
  sugarServings: {
    label: 'Added sugar',
    options: [
      { value: 1, label: 'Low' },
      { value: 3, label: 'Moderate' },
      { value: 7, label: 'High' },
    ],
  },
  exerciseMinutes: {
    label: 'Exercise per week',
    options: [
      { value: 40, label: 'Under 80 min' },
      { value: 100, label: '80 to 150 min' },
      { value: 160, label: '150+ min' },
    ],
  },
});

const SLEEP_HOURS = { under6: 5.5, '6to7': 6.5, '7plus': 7.5 };
const OUTDOOR_MINUTES = { indoors: 10, some: 25, lots: 60 };

const SUNSCREEN_STEP = /sunscreen|\bspf\b|sun protection|sunblock/i;

export const isSunscreenStep = (text) => SUNSCREEN_STEP.test(String(text || ''));

/**
 * From a plan's steps and the routine logs since the plan began: on how many
 * of the tracked days a sunscreen step was ticked.
 * @param {{ steps: {id: string, text: string}[], logs: {date: any, amCompleted?: string[], pmCompleted?: string[]}[], dayKeyOf: (d: Date) => string, windowStartKey: string, todayKey: string }} args
 */
export function countSunscreenDays({ steps = [], logs = [], dayKeyOf, windowStartKey, todayKey }) {
  const ids = new Set(steps.filter((s) => isSunscreenStep(s.text)).map((s) => s.id));
  const days = new Set();
  for (const log of logs) {
    const key = dayKeyOf(new Date(log.date));
    if (key < windowStartKey || key > todayKey) continue;
    const ticked = [...(log.amCompleted || []), ...(log.pmCompleted || [])];
    if (ticked.some((id) => ids.has(id))) days.add(key);
  }
  const trackedDays = Math.max(0, Math.round((Date.parse(todayKey) - Date.parse(windowStartKey)) / 86400000) + 1);
  return { sunscreenDays: days.size, trackedDays, hasSunscreenStep: ids.size > 0 };
}

const allowed = (key, value) => INPUT_META[key].options.some((o) => o.value === value);

/**
 * Lifestyle inputs for a projection, each with where it came from.
 * Order of trust: the person's own change, then what they did (ticks), then
 * what they told us (profile), then an assumed default.
 * @returns {{ values: Record<string, number|boolean>, sources: Record<string, 'override'|'ticks'|'profile'|'default'>, details: Record<string, string> }}
 */
export function buildLifestyleInputs({ skinProfile = null, sunscreen = null, overrides = {} } = {}) {
  const values = { ...DEFAULT_LIFESTYLE };
  const sources = Object.fromEntries(INPUT_KEYS.map((k) => [k, 'default']));
  const details = {};

  if (skinProfile) {
    if (SLEEP_HOURS[skinProfile.sleep] != null) {
      values.sleepHours = SLEEP_HOURS[skinProfile.sleep];
      sources.sleepHours = 'profile';
    }
    if (OUTDOOR_MINUTES[skinProfile.outdoor] != null) {
      values.uvMinutes = OUTDOOR_MINUTES[skinProfile.outdoor];
      sources.uvMinutes = 'profile';
    }
    if (typeof skinProfile.smoker === 'boolean') {
      values.smokeCigarettes = skinProfile.smoker ? 10 : 0;
      sources.smokeCigarettes = 'profile';
      if (skinProfile.smoker) details.smokeCigarettes = 'You said you smoke; we assume about 10 a day.';
    }
    if (Array.isArray(skinProfile.currentProducts)) {
      values.spfUsed = skinProfile.currentProducts.includes('sunscreen');
      sources.spfUsed = 'profile';
    }
  }

  if (sunscreen && sunscreen.hasSunscreenStep && sunscreen.trackedDays >= MIN_TRACKED_DAYS) {
    values.spfUsed = sunscreen.sunscreenDays / sunscreen.trackedDays > 0.5;
    sources.spfUsed = 'ticks';
    details.spfUsed = `Ticked on ${sunscreen.sunscreenDays} of the last ${sunscreen.trackedDays} days.`;
  }

  for (const [key, value] of Object.entries(overrides || {})) {
    if (INPUT_META[key] && allowed(key, value)) {
      values[key] = value;
      sources[key] = 'override';
    }
  }

  return { values, sources, details };
}
