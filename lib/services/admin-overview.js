import 'server-only';
import { connectDb, User, Selfie, Simulation, RoutineLog, Plan, ProductCheck } from '@/app/lib/mongoose';
import { CREDIT_COST, YOUCAM_USD_PER_CREDIT } from '@/lib/constants/credits';

const DAY_MS = 86400000;
const WINDOW_DAYS = 30;
const PRICES = { standard: 8, premium: 15 };

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

function series(rows, from) {
  const map = new Map(rows.map((r) => [r._id, r.n]));
  const out = [];
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const key = dayKey(from.getTime() + i * DAY_MS);
    out.push({ day: key, n: map.get(key) ?? 0 });
  }
  return out;
}

const perDay = (field) => [
  { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: `$${field}` } }, n: { $sum: 1 } } },
];

export async function fetchAdminOverview(now = new Date()) {
  await connectDb();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - (WINDOW_DAYS - 1) * DAY_MS);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const since = { $gte: from };

  const [
    totalUsers,
    onboarded,
    tiers,
    signups,
    totalScans,
    scans,
    lowScans,
    totalSims,
    sims,
    activeToday,
    careDays,
    mirrorChecks,
    activePlans,
    coachedPlans,
    reactions,
    totalChecks,
    checks,
    recentChecks,
  ] = await Promise.all([
    User.estimatedDocumentCount(),
    User.countDocuments({ onboardingComplete: true }),
    User.aggregate([{ $match: { isSubscribed: true } }, { $group: { _id: '$tier', n: { $sum: 1 } } }]),
    User.aggregate([{ $match: { createdAt: since } }, ...perDay('createdAt')]),
    Selfie.estimatedDocumentCount(),
    Selfie.aggregate([{ $match: { takenAt: since } }, ...perDay('takenAt')]),
    Selfie.countDocuments({ takenAt: since, 'quality.level': 'low' }),
    Simulation.estimatedDocumentCount(),
    Simulation.aggregate([{ $match: { createdAt: since } }, ...perDay('createdAt')]),
    RoutineLog.distinct('userId', { date: { $gte: today } }).then((ids) => ids.length),
    RoutineLog.countDocuments({ date: since, $or: [{ 'amCompleted.0': { $exists: true } }, { 'pmCompleted.0': { $exists: true } }] }),
    RoutineLog.countDocuments({ date: since, mirror: { $ne: null } }),
    Plan.countDocuments({ status: 'active' }),
    Plan.countDocuments({ status: 'active', 'coach.version': { $gte: 1 } }),
    Plan.aggregate([
      { $match: { 'coach.reactions.0': { $exists: true } } },
      { $unwind: '$coach.reactions' },
      { $match: { 'coach.reactions.at': since } },
      { $group: { _id: '$coach.reactions.level', n: { $sum: 1 } } },
    ]),
    ProductCheck.estimatedDocumentCount(),
    ProductCheck.aggregate([{ $match: { createdAt: since } }, { $group: { _id: '$report.verdict', n: { $sum: 1 } } }]),
    ProductCheck.find({}).sort({ createdAt: -1 }).limit(6).select('name report.verdict report.classes createdAt').lean(),
  ]);

  const paid = Object.fromEntries(tiers.map((t) => [t._id, t.n]));
  const paying = (paid.standard ?? 0) + (paid.premium ?? 0);
  const mrr = (paid.standard ?? 0) * PRICES.standard + (paid.premium ?? 0) * PRICES.premium;
  const scanSeries = series(scans, from);
  const simSeries = series(sims, from);
  const signupSeries = series(signups, from);
  const scans30 = scanSeries.reduce((s, d) => s + d.n, 0);
  const sims30 = simSeries.reduce((s, d) => s + d.n, 0);
  const signups30 = signupSeries.reduce((s, d) => s + d.n, 0);
  const reactionCounts = Object.fromEntries(reactions.map((r) => [r._id, r.n]));
  const checkCounts = Object.fromEntries(checks.map((c) => [c._id, c.n]));
  const checks30 = Object.values(checkCounts).reduce((s, n) => s + n, 0);
  const youcamCost = (scans30 * CREDIT_COST.scan + sims30 * CREDIT_COST.simulation) * YOUCAM_USD_PER_CREDIT;

  return {
    generatedAt: now.toISOString(),
    subscriptions: {
      mrr,
      paying,
      standard: paid.standard ?? 0,
      premium: paid.premium ?? 0,
      conversion: onboarded ? Math.round((paying / onboarded) * 1000) / 10 : 0,
    },
    coach: {
      activeToday,
      careDays,
      mirrorChecks,
      activePlans,
      coachedPlans,
      reactions: {
        fine: reactionCounts.fine ?? 0,
        tingle: reactionCounts.tingle ?? 0,
        irritated: reactionCounts.irritated ?? 0,
        breakout: reactionCounts.breakout ?? 0,
      },
    },
    youcam: {
      scans30,
      sims30,
      cost30: Math.round(youcamCost * 100) / 100,
      lowShare: scans30 ? Math.round((lowScans / scans30) * 100) : 0,
    },
    allTime: { totalUsers, onboarded, signups30, totalScans, totalSims, totalChecks, checks30, checkVerdicts: checkCounts },
    series: scanSeries.map((d, i) => ({ day: d.day.slice(5), scans: d.n, sims: simSeries[i].n, signups: signupSeries[i].n })),
    recentChecks: recentChecks.map((c) => ({
      id: String(c._id),
      name: c.name || 'Unnamed product',
      verdict: c.report?.verdict ?? 'neutral',
      classes: (c.report?.classes ?? []).filter((x) => !x.trace).map((x) => x.label).slice(0, 3),
      at: new Date(c.createdAt).toISOString(),
    })),
  };
}
