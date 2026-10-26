export const QUALITY_THRESHOLDS = Object.freeze({
  retake: Object.freeze({ meanLumaBelow: 40, meanLumaAbove: 225, clipHighAbove: 0.35, clipLowAbove: 0.5, sharpnessBelow: 5 }),
  low: Object.freeze({ meanLumaBelow: 65, meanLumaAbove: 200, clipHighAbove: 0.15, sharpnessBelow: 12, unevennessAbove: 0.3 }),
});

export const ISSUE_MESSAGES = Object.freeze({
  too_dark: 'The photo is too dark.',
  too_bright: 'The photo is too bright.',
  blown_highlights: 'Parts of your face are washed out by bright light.',
  blurry: 'The photo is blurry.',
  uneven_light: 'The light is uneven, with one side of your face brighter than the other.',
  incomplete_scores: 'The analysis could not read every skin measure.',
  poor_photo: 'The photo quality was marginal.',
});

const ISSUE_CODES = Object.keys(ISSUE_MESSAGES);
const CLIP_LOW = 20;
const CLIP_HIGH = 240;

const lumaAt = (data, i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

/**
 * Lighting and sharpness measures for a photo, on pixels already scaled down
 * (RGBA, row-major). Pure, so it is tested with synthetic images.
 * @param {{ data: ArrayLike<number>, width: number, height: number }} pixels
 */
export function measureImagePixels({ data, width, height }) {
  const n = width * height;
  const gray = new Float32Array(n);
  let sum = 0;
  let low = 0;
  let high = 0;
  for (let p = 0; p < n; p += 1) {
    const g = lumaAt(data, p * 4);
    gray[p] = g;
    sum += g;
    if (g < CLIP_LOW) low += 1;
    if (g > CLIP_HIGH) high += 1;
  }
  const meanLuma = sum / n;

  let lapSum = 0;
  let lapSq = 0;
  let lapN = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const c = y * width + x;
      const lap = 4 * gray[c] - gray[c - 1] - gray[c + 1] - gray[c - width] - gray[c + width];
      lapSum += lap;
      lapSq += lap * lap;
      lapN += 1;
    }
  }
  const lapMean = lapN ? lapSum / lapN : 0;
  const sharpness = lapN ? lapSq / lapN - lapMean * lapMean : 0;

  const top = Math.floor(height * 0.2);
  const bottom = Math.ceil(height * 0.8);
  const mid = Math.floor(width / 2);
  let leftSum = 0;
  let leftN = 0;
  let rightSum = 0;
  let rightN = 0;
  for (let y = top; y < bottom; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x < mid) {
        leftSum += gray[y * width + x];
        leftN += 1;
      } else {
        rightSum += gray[y * width + x];
        rightN += 1;
      }
    }
  }
  const leftMean = leftN ? leftSum / leftN : meanLuma;
  const rightMean = rightN ? rightSum / rightN : meanLuma;
  const unevenness = Math.abs(leftMean - rightMean) / Math.max(1, (leftMean + rightMean) / 2);

  return { meanLuma, clipLow: low / n, clipHigh: high / n, sharpness, unevenness };
}

/**
 * 'retake': too poor to analyse, ask for another photo before anything is stored.
 * 'low': good enough to analyse, but the scores should not count as real change.
 * 'ok': fine.
 * @returns {{ verdict: 'ok'|'low'|'retake', issues: string[], metrics: ReturnType<typeof measureImagePixels> }}
 */
export function assessImagePixels(pixels, thresholds = QUALITY_THRESHOLDS) {
  const metrics = measureImagePixels(pixels);
  const r = thresholds.retake;
  const l = thresholds.low;
  const retake = new Set();
  const soft = new Set();

  if (metrics.meanLuma < r.meanLumaBelow || metrics.clipLow > r.clipLowAbove) retake.add('too_dark');
  if (metrics.meanLuma > r.meanLumaAbove) retake.add('too_bright');
  if (metrics.clipHigh > r.clipHighAbove) retake.add('blown_highlights');
  if (metrics.sharpness < r.sharpnessBelow) retake.add('blurry');

  if (metrics.meanLuma < l.meanLumaBelow) soft.add('too_dark');
  if (metrics.meanLuma > l.meanLumaAbove) soft.add('too_bright');
  if (metrics.clipHigh > l.clipHighAbove) soft.add('blown_highlights');
  if (metrics.sharpness < l.sharpnessBelow) soft.add('blurry');
  if (metrics.unevenness > l.unevennessAbove) soft.add('uneven_light');

  if (retake.size) return { verdict: 'retake', issues: [...retake], metrics };
  if (soft.size) return { verdict: 'low', issues: [...soft], metrics };
  return { verdict: 'ok', issues: [], metrics };
}

export function describeIssues(issues = []) {
  return issues.filter((i) => ISSUE_MESSAGES[i]).map((i) => ISSUE_MESSAGES[i]).join(' ');
}

const round3 = (n) => Math.round(n * 1000) / 1000;
const METRIC_KEYS = ['meanLuma', 'clipLow', 'clipHigh', 'sharpness', 'unevenness'];

/** What the server accepts from the client's own measurement: known verdicts, known issue codes, finite numbers. */
export function sanitizeClientQuality(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!['ok', 'low', 'retake'].includes(raw.verdict)) return null;
  const issues = Array.isArray(raw.issues) ? [...new Set(raw.issues.filter((i) => ISSUE_CODES.includes(i)))] : [];
  const metrics = {};
  for (const key of METRIC_KEYS) {
    const v = raw.metrics?.[key];
    if (typeof v === 'number' && Number.isFinite(v)) metrics[key] = round3(v);
  }
  return { verdict: raw.verdict, issues, metrics };
}

const isScore = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * Whether a stored scan's scores can stand for real change. Low confidence when
 * the photo was marginal or the analysis could not read every measure.
 * @returns {{ level: 'good'|'low', issues: string[], checked: boolean, metrics?: Record<string, number> }}
 */
export function assessScanConfidence({ clientQuality = null, scores = {} } = {}) {
  const issues = new Set();
  if (clientQuality && clientQuality.verdict !== 'ok') clientQuality.issues.forEach((i) => issues.add(i));
  if (clientQuality && clientQuality.verdict !== 'ok' && !clientQuality.issues.length) issues.add('poor_photo');
  if (!['wrinkles', 'firmness', 'spots', 'radiance'].every((k) => isScore(scores?.[k]))) issues.add('incomplete_scores');
  return {
    level: issues.size ? 'low' : 'good',
    issues: [...issues],
    checked: Boolean(clientQuality),
    ...(clientQuality ? { metrics: clientQuality.metrics } : {}),
  };
}

export const isLowConfidence = (scan) => scan?.quality?.level === 'low';
