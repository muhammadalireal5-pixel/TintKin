import "server-only";
import dns from "dns";
import * as Sentry from "@sentry/nextjs";
import mongoose from 'mongoose';
import { PRODUCT_TYPES } from "@/lib/constants/products";
import { PLAN_METRICS, STEP_METRICS, PLAN_STATUS, CHECKIN_STATUS } from "@/lib/constants/plan";
import { CONCERN_KEYS } from "@/lib/constants/profile";
import { encryptField, decryptField } from "@/lib/utils/field-crypto";

// mongodb+srv:// needs SRV lookups via Node's own resolver, which reads the
// adapter DNS list directly. When that list is loopback-only (VPNs, DNS
// proxies, ad-blockers) and nothing answers on :53, every lookup fails with
// ECONNREFUSED even though OS-level lookups work. Only override in that case
// so real resolvers (e.g. VPC DNS for private endpoints) are left alone.
// The driver uses dns.promises, and once that resolver has been initialized
// dns.setServers() no longer reaches it, so both must be set.
const isLoopback = (/** @type {string} */ s) => /^(127\.|::1$|\[::1\])/.test(s);
const systemDnsServers = dns.promises.getServers();
if (systemDnsServers.length === 0 || systemDnsServers.every(isLoopback)) {
    const fallbackDnsServers = ["1.1.1.1", "8.8.8.8"];
    dns.setServers(fallbackDnsServers);
    dns.promises.setServers(fallbackDnsServers);
}

let cached = /** @type {any} */ (global).mongoose;
if (!cached) {
  cached = /** @type {any} */ (global).mongoose = { conn: null, promise: null };
}

const CONNECT_RETRY_DELAYS_MS = [500, 1500, 4000];

const connectWithRetry = async () => {
    const opts = {
        bufferCommands: false,
        maxPoolSize: 10,
        maxIdleTimeMS: 10000,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
    };

    for (let attempt = 0; ; attempt++) {
        try {
            return await mongoose.connect(process.env.MONGODB_URI || "", opts);
        } catch (error) {
            if (attempt >= CONNECT_RETRY_DELAYS_MS.length) {
                Sentry.captureException(error, { tags: { scope: "mongoose-connect" } });
                throw error;
            }
            // Never log error.message here: some MongoDB driver errors (e.g. a
            // malformed URI) embed the full connection string, credentials
            // included. Name/code only; the full error still reaches Sentry
            // on final failure below.
            console.warn(
                `[MONGOOSE] connect attempt ${attempt + 1} failed, retrying in ${CONNECT_RETRY_DELAYS_MS[attempt]}ms (${error?.name || error?.code || "unknown error"})`
            );
            await new Promise(resolve => setTimeout(resolve, CONNECT_RETRY_DELAYS_MS[attempt]));
        }
    }
};

export const connectDb = async () => {
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    if (!cached.promise || mongoose.connection.readyState === 0) {
        cached.promise = connectWithRetry().catch(error => {
            cached.promise = null;
            throw error;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
};

const UserSchema = new mongoose.Schema({
    email: {
      type: String,
      lowercase: true,
      trim: true,
      index: { unique: true, partialFilterExpression: { email: { $type: "string" } } },
    },
    passwordHash: { type: String, select: false },
    googleId: {
      type: String,
      index: { unique: true, partialFilterExpression: { googleId: { $type: "string" } } },
    },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    // Credentials sign-ups only (Google accounts are verified by the IdP —
    // see H1 in AUDIT.md's email_verified check). Defense-in-depth, not a
    // login gate: unverified users can still sign in (see M21 in AUDIT.md).
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    // Set once, the first time the user is asked (at their first scan, not
    // at sign-up — that's when a photo is actually collected). Timestamp
    // doubles as a consent record.
    termsAcceptedAt: { type: Date, default: null },
    // Copied into the session JWT at sign-in; bumping it revokes every
    // existing session (password reset, Google taking over a password account).
    sessionVersion: { type: Number, default: 0 },
    displayName: { type: String },
    photoURL: { type: String },
    lastLoginAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    birthDate: { type: Date },
    sex: { type: String },
    skinType: { type: String },
    goals: [String],
    customGoal: String,
    // Onboarding questionnaire the plan is built from (see lib/plan/engine.js).
    skinProfile: {
        _id: false,
        type: new mongoose.Schema({
            concerns: [{ _id: false, key: String, rating: Number }],
            // Health-related answers are encrypted at rest (lib/utils/field-crypto.js);
            // reading through a document decrypts, so use toObject({ getters: true }).
            sensitivity: { type: String, set: encryptField, get: decryptField },
            phototype: Number,
            currentProducts: [String],
            sleep: String,
            outdoor: String,
            smoker: Boolean,
            stress: String,
            pregnancy: { type: String, set: encryptField, get: decryptField },
            routineTime: String,
            // Months the person wants to work on their skin (1-12); unset on accounts that were never asked.
            planMonths: Number,
        }, { _id: false }),
        default: undefined,
    },
    onboardingComplete: { type: Boolean, default: false },
    // Ids of one-time "what's new" announcements already dismissed (lib/constants/announcements.js).
    seenAnnouncements: [String],
    // Kin walkthroughs the person has finished or declined ('today', 'scan'), so
    // Kin offers each once per account instead of once per browser.
    seenTours: [String],
    recommendationsLockedUntil: { type: Date, default: null },
    workoutLockedUntil: { type: Date, default: null },
    isSubscribed: { type: Boolean, default: false },
    subscribedAt: { type: Date, default: null },
    tier: { type: String, enum: ['free', 'standard', 'premium', 'pending'], default: 'free' },
    requestedTier: { type: String, enum: ['standard', 'premium', 'pending', 'free'] },
    upgradeRequestedAt: { type: Date },
    scanCount: { type: Number, default: 0 },
    simulationsUsed: { type: Number, default: 0 },
    currentPeriodStart: { type: Date, default: Date.now },
    currentPeriodEnd: { type: Date, default: null },
    extraScans: { type: Number, default: 0 },
    // Polar's own subscription id, needed to call updateSubscriptions(id, ...)
    // for upgrade/downgrade without an extra list-by-customer lookup.
    polarSubscriptionId: { type: String, default: null },
    // Purchased via the credit shop (lib/constants/credits.js), spent as a
    // fallback once the subscription's own quota + admin-granted extras are
    // exhausted. Priced against YouCam's own real credit cost ($0.048/credit).
    creditBalance: { type: Number, default: 0 },
    // Polar order ids already applied to creditBalance, so a retried
    // onOrderPaid webhook delivery for the same order can't double-credit.
    creditedOrderIds: [{ type: String }],
    // Set when a plan check-in's report becomes ready (and the "report ready"
    // email went out); cleared once every ready report has been generated.
    reportReadyAt: { type: Date, default: null },
    extraSimulations: { type: Number, default: 0 },
    // Atomic usage counters backing the scan/simulation quota reservation in
    // app/lib/quota.js. dayKey/monthKey are "YYYY-MM-DD"/"YYYY-MM" period
    // identifiers (see lib/utils/date.js); a stale key means the counter for
    // that period hasn't been touched yet and reads as 0.
    scanUsage: {
      dayKey: { type: String, default: null },
      dayCount: { type: Number, default: 0 },
      monthKey: { type: String, default: null },
      monthCount: { type: Number, default: 0 },
    },
    simUsage: {
      monthKey: { type: String, default: null },
      monthCount: { type: Number, default: 0 },
    },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastUploadDate: { type: Date, default: null },
    // Streak/habit tracking (lib/utils/streak.js). An "active" day is a scan OR
    // a ticked routine step, keyed as the user's local "YYYY-MM-DD".
    lastActiveDayKey: { type: String, default: null },
    streakFreezeWeek: { type: String, default: null },
    activeDays: { type: Number, default: 0 },
    lastRoutineDayKey: { type: String, default: null },
    // Day key of the last morning/evening push reminder sent (api/cron/reminders).
    lastPushAm: { type: String, default: null },
    lastPushPm: { type: String, default: null },
    routineDays: { type: Number, default: 0 },
    badges: [{ type: String }],
    optInComparison: { type: Boolean, default: false },
    region: { type: String, default: null },
    location: {
      lat: Number,
      lng: Number,
      city: String,
      country: String,
      countryCode: String,
    },
    photoPrivacy: { type: String, enum: ['store', 'delete'], default: 'store' },
    baselineSelfie: { type: String, default: null },
    locationPromptDismissed: { type: Boolean, default: false },
    // IANA zone (e.g. "Australia/Sydney"), learned passively from the browser
    // timezone already sent by analyzeAndSaveSelfie/runWhatIfSim/saveRoutineCompletion
    // — never prompted for. Lets server-rendered reads (getLatestData's "today's
    // routine") use the user's real day boundary instead of defaulting to UTC.
    timezone: { type: String, default: null }
}, { strict: true });

const SelfieSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    imageUrl: String,
    isAnalyzed: { type: Boolean, default: true },
    takenAt: { type: Date, default: Date.now, index: true },
    overallScore: Number,
    skinAge: Number,
    scores: { wrinkles: Number, firmness: Number, spots: Number, radiance: Number },
    maskUrls: { type: mongoose.Schema.Types.Mixed, default: {} },
    youCamTaskId: String,
    adviceStatus: { type: String, enum: ['ok', 'pending', 'error', 'partial', 'empty'], default: 'ok' },
    critique: String,
    habits: [String],
    facialWorkout: String,
    amRoutine: [String],
    pmRoutine: [String],
    recommendedProducts: {
      type: [{
        type: { type: String, enum: PRODUCT_TYPES },
        formula: { type: String, required: true },
        description: { type: String, required: true },
        isDefaultFallback: { type: Boolean, default: false }
      }],
      validate: {
        validator: function(/** @type {any} */ v) {
          if (!this.isAnalyzed) return true;
          if (this.adviceStatus === 'error') return true;
          return Array.isArray(v) && (v.length === 0 || v.length === 3);
        },
        message: 'Recommended products must contain 3 items or be empty if advice failed.'
      }
    }
}, { strict: true });
SelfieSchema.index({ userId: 1, takenAt: -1 });

const LifestyleSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, default: Date.now, index: true },
    sleepHours: Number,
    spfUsed: Boolean,
    uvMinutes: Number,
    sugarServings: Number,
    smokeCigarettes: Number,
    exerciseMinutes: Number,
}, { strict: true });
LifestyleSchema.index({ userId: 1, date: -1 });

const SimulationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: String,
    scenarioA: Object,
    scenarioB: Object,
    deltas: Object,
    targetAge: Number,
    resultA: Object,
    resultB: Object,
    confirmed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, index: true },
}, { strict: true });
SimulationSchema.index({ userId: 1, createdAt: -1 });

const RoutineLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, default: Date.now, index: true },
    amCompleted: [String],
    pmCompleted: [String],
}, { strict: true });
RoutineLogSchema.index({ userId: 1, date: -1 });

const ReportSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['weekly', 'monthly', 'manual', 'checkin'], default: 'manual' },
    // Set on check-in reports: the plan and check-in day this report covers.
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', default: null },
    checkInDay: { type: Number, default: null },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    highlights: [String],
    compliments: [String],
    scanCount: Number,
    averageScore: Number,
    trend: { type: String, enum: ['improving', 'declining', 'stable'] },
    trendValue: Number,
    aiGenerated: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now, index: true },
}, { strict: true });
ReportSchema.index({ userId: 1, createdAt: -1 });
// One report per check-in, even if generate is tapped twice.
ReportSchema.index({ userId: 1, planId: 1, checkInDay: 1 }, { unique: true, partialFilterExpression: { planId: { $type: 'objectId' } } });

const planScores = Object.fromEntries(PLAN_METRICS.map((metric) => [metric, Number]));
// Self-ratings (1-5) by concern key.
const planRatings = Object.fromEntries(CONCERN_KEYS.map((key) => [key, Number]));

// A user's skin plan (see lib/plan/). Steps carry their own start/end plan day
// and a stable id, so the plan can be adjusted at a check-in without rewriting
// history, and routine ticks keep pointing at the same step.
const PlanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: Object.values(PLAN_STATUS), default: PLAN_STATUS.ACTIVE },
    version: { type: Number, default: 1 },
    // Bumped on every guarded write so two writers racing on one plan cannot undo each other.
    rev: { type: Number, default: 0 },
    durationDays: { type: Number, default: 30 },
    // Each month of a longer journey is its own plan: "month 2 of 5".
    monthIndex: { type: Number, default: 1 },
    totalMonths: { type: Number, default: 1 },
    // Local day key ("YYYY-MM-DD", the user's timezone) of plan day 1.
    startDayKey: { type: String, required: true },
    startedAt: { type: Date, default: Date.now },
    endsAt: Date,
    createdFromSelfieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Selfie', default: null },
    generatedBy: { type: String, enum: ['ai', 'fallback', 'rules'], default: 'ai' },
    goals: [String],
    summary: String,
    baseline: {
        overallScore: Number,
        skinAge: Number,
        scores: planScores,
        ratings: planRatings,
    },
    focus: [{
        _id: false,
        metric: { type: String, enum: STEP_METRICS },
        // 'rating' = self-rated 1-5; 'score' = YouCam 0-100 (plans made from a scan).
        scale: { type: String, enum: ['rating', 'score'], default: 'score' },
        label: String,
        baseline: Number,
        target: Number,
    }],
    phases: [{ _id: false, key: String, name: String, startDay: Number, endDay: Number, intent: String }],
    steps: [{
        _id: false,
        id: { type: String, required: true },
        slot: { type: String, enum: ['am', 'pm'], required: true },
        text: { type: String, required: true },
        why: String,
        metric: { type: String, enum: [...STEP_METRICS, null], default: null },
        startDay: { type: Number, default: 1 },
        endDay: { type: Number, default: null },
    }],
    checkIns: [{
        _id: false,
        day: Number,
        dueAt: Date,
        status: { type: String, enum: Object.values(CHECKIN_STATUS), default: CHECKIN_STATUS.UPCOMING },
        selfieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Selfie', default: null },
        completedAt: Date,
        overallScore: Number,
        scores: planScores,
        // Self-ratings (1-5) given at this check-in, and how it was completed.
        ratings: planRatings,
        method: { type: String, enum: ['self', 'scan', null], default: null },
    }],
    // The most recent scan, so progress reads need no extra query.
    latest: {
        selfieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Selfie', default: null },
        at: Date,
        overallScore: Number,
        scores: planScores,
        ratings: planRatings,
    },
    adjustments: [{
        _id: false,
        version: Number,
        at: Date,
        day: Number,
        // The check-in this adjustment answered; makes adjusting idempotent.
        checkInDay: { type: Number, default: null },
        // Who made the change: 'check-in', 'kin', 'profile' or 'safety'.
        source: String,
        selfieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Selfie', default: null },
        note: String,
        dropped: [String],
        added: [String],
    }],
    createdAt: { type: Date, default: Date.now },
}, { strict: true });
PlanSchema.index({ userId: 1, createdAt: -1 });
// At most one active plan per user, so two concurrent "create my plan" calls
// can't both succeed; the loser hits a duplicate-key error and reads the winner.
PlanSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { status: PLAN_STATUS.ACTIVE }, name: 'one_active_plan_per_user' });

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Selfie = mongoose.models.Selfie || mongoose.model('Selfie', SelfieSchema);
export const Lifestyle = mongoose.models.Lifestyle || mongoose.model('Lifestyle', LifestyleSchema);
export const Simulation = mongoose.models.Simulation || mongoose.model('Simulation', SimulationSchema);
export const RoutineLog = mongoose.models.RoutineLog || mongoose.model('RoutineLog', RoutineLogSchema);
export const Report = mongoose.models.Report || mongoose.model('Report', ReportSchema);
export const Plan = mongoose.models.Plan || mongoose.model('Plan', PlanSchema);

/**
 * Rate Limit Schema with TTL index for automatic cleanup
 * Setup: db.ratelimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
 */
const RateLimitSchema = new mongoose.Schema({
    identifier: { type: String, required: true },
    action: { type: String, required: true, enum: ['login', 'register', 'password-reset', 'upload', 'analyze', 'simulate', 'product_ocr', 'admin_login', 'export'] },
    windowStart: { type: Date, required: true },
    count: { type: Number, required: true, default: 1 },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
}, { strict: true, timestamps: true });

// TTL index for automatic cleanup - MUST be created in MongoDB
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RateLimitSchema.index({ identifier: 1, action: 1, windowStart: 1 });

export const RateLimit = mongoose.models.RateLimit || mongoose.model('RateLimit', RateLimitSchema);

// Single document: lets "Log out" invalidate every admin token issued before
// that moment, even though the token itself is a stateless signed cookie.
const AdminAuthStateSchema = new mongoose.Schema({
    _id: { type: String, default: "singleton" },
    revokedBefore: { type: Date, default: null },
}, { strict: true });

export const AdminAuthState = mongoose.models.AdminAuthState || mongoose.model('AdminAuthState', AdminAuthStateSchema);

// A purchasable credit pack shown on /shop. `polarProductId` is a one-time,
// fixed-price Polar product created/updated by the admin shop manager
// (app/lib/shop-actions.js) — never hand-edited. Packs are archived
// (active: false) rather than deleted so the webhook and refund lookups can
// still resolve credits for orders placed against a retired pack.
const CreditPackSchema = new mongoose.Schema({
    label: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    credits: { type: Number, required: true, min: 1 },
    priceCents: { type: Number, required: true, min: 1 },
    polarProductId: { type: String, required: true, index: true },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
}, { strict: true, timestamps: true });

export const CreditPack = mongoose.models.CreditPack || mongoose.model('CreditPack', CreditPackSchema);

// Singleton doc backing the shop's "custom amount" purchase: a per-credit
// price used both to show a live quote on /shop and to price the Polar
// unit-based product (`customProductPolarId`) that checkout actually buys
// against. pricePerCreditCents can carry a fractional cent (e.g. 4.8).
const ShopSettingsSchema = new mongoose.Schema({
    _id: { type: String, default: "singleton" },
    pricePerCreditCents: { type: Number, required: true },
    minCustomCredits: { type: Number, default: 50 },
    maxCustomCredits: { type: Number, default: 5000 },
    customProductPolarId: { type: String, default: null },
}, { strict: true, timestamps: true });

export const ShopSettings = mongoose.models.ShopSettings || mongoose.model('ShopSettings', ShopSettingsSchema);

// One row per subscribed browser/device (a user can have several — phone,
// desktop, etc). `endpoint` is unique per browser push subscription and is
// how we dedupe re-subscribes and drop ones the browser has revoked.
const PushSubscriptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    createdAt: { type: Date, default: Date.now },
}, { strict: true });

// In-app reviews / feedback / complaints sent through the companion. Private:
// only the admin portal reads these. status/priority/adminNote are the
// owner's own triage fields ("what I'll do to fix this") and never reach users.
const FeedbackSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userEmail: { type: String, default: '' },
    userName: { type: String, default: '' },
    tier: { type: String, default: 'free' },
    scanCount: { type: Number, default: 0 },
    type: { type: String, enum: ['review', 'feedback', 'complaint', 'idea', 'bug', 'other'], default: 'feedback', index: true },
    rating: { type: Number, min: 1, max: 5, default: null },
    message: { type: String, required: true, maxlength: 2000 },
    page: { type: String, default: '' },
    viewport: { type: String, default: '' },
    device: { type: String, default: '' },
    userAgent: { type: String, default: '', maxlength: 400 },
    theme: { type: String, default: '' },
    status: { type: String, enum: ['new', 'in_progress', 'resolved', 'wont_fix'], default: 'new', index: true },
    priority: { type: String, enum: ['low', 'medium', 'high', null], default: null },
    adminNote: { type: String, default: '', maxlength: 4000 },
    resolvedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
}, { strict: true });

export const Feedback = mongoose.models.Feedback || mongoose.model('Feedback', FeedbackSchema);

export const PushSubscription = mongoose.models.PushSubscription || mongoose.model('PushSubscription', PushSubscriptionSchema);

