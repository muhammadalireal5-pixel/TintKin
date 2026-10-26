export const SOURCE_LABELS = Object.freeze({
  profile: 'From your profile',
  ticks: 'From your ticked steps',
  checkins: 'From your check-ins',
  override: 'Your change',
  default: 'Assumed',
});

export function reliabilityNote(reliability, { legacy = false } = {}) {
  if (legacy) return 'This projection was made before we used your real habits, so treat the numbers as rough.';
  if (!reliability) return '';
  if (reliability.scores === 'low') {
    return reliability.scansBasis === 'low'
      ? 'We need a few more scans over at least two weeks before we can show numbers. The photo comparison is still shown.'
      : 'Too many of your habits are still assumed to show reliable numbers. Update your skin profile to see them.';
  }
  if (reliability.scores === 'limited') {
    return 'Early estimate: shown as ranges because we have limited scan history or assumed some of your habits.';
  }
  return '';
}
