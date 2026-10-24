/**
 * Trailing rolling average for a score series. Single scans swing with light,
 * angle and sleep, so the trend line smooths over a window of days instead.
 * @param {{ at: Date|string|number, score: number }[]} points oldest first
 * @param {number} windowDays inclusive window ending at each point (default 7)
 * @returns {number[]} one rounded average per point, in the same order
 */
export function rollingAverage(points, windowDays = 7) {
  const span = windowDays * 86400000;
  const times = points.map((p) => new Date(p.at).getTime());
  return points.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let j = 0; j <= i; j += 1) {
      if (times[i] - times[j] < span) {
        sum += points[j].score;
        n += 1;
      }
    }
    return Math.round(sum / n);
  });
}
