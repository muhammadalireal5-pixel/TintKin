import "server-only";
import mongoose from 'mongoose';
import { PRODUCT_TYPES } from "@/lib/constants/products";

let cached = /** @type {any} */ (global).mongoose;
if (!cached) {
  cached = /** @type {any} */ (global).mongoose = { conn: null, promise: null };
}

export const connectDb = async () => {
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    if (!cached.promise || mongoose.connection.readyState === 0) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,
            maxIdleTimeMS: 10000,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        };
        cached.promise = mongoose.connect(process.env.MONGODB_URI || "", opts)
            .then(mongoose => mongoose)
            .catch(error => {
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
    firebaseUid: {
      type: String,
      index: { unique: true, partialFilterExpression: { firebaseUid: { $type: "string" } } },
    },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    displayName: { type: String },
    photoURL: { type: String },
    lastLoginAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    birthDate: { type: Date },
    sex: { type: String },
    skinType: { type: String },
    goals: [String],
    customGoal: String,
    onboardingComplete: { type: Boolean, default: false },
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
    extraSimulations: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastUploadDate: { type: Date, default: null },
    badges: [{ type: String }],
    optInComparison: { type: Boolean, default: false },
    standardPlanFrequency: { type: String, enum: ['every_other_day', 'flexible'], default: 'flexible' },
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
    locationPromptDismissed: { type: Boolean, default: false }
}, { strict: true });

const SelfieSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    imageUrl: String,
    isAnalyzed: { type: Boolean, default: true },
    takenAt: { type: Date, default: Date.now, index: true },
    overallScore: Number,
    skinAge: Number,
    scores: { wrinkles: Number, firmness: Number, spots: Number, radiance: Number },
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

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Selfie = mongoose.models.Selfie || mongoose.model('Selfie', SelfieSchema);
export const Lifestyle = mongoose.models.Lifestyle || mongoose.model('Lifestyle', LifestyleSchema);
export const Simulation = mongoose.models.Simulation || mongoose.model('Simulation', SimulationSchema);
export const RoutineLog = mongoose.models.RoutineLog || mongoose.model('RoutineLog', RoutineLogSchema);

const AdminOTPSchema = new mongoose.Schema({
    email: { type: String, required: true, index: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    ttlExpiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    used: { type: Boolean, default: false },
}, { timestamps: true, strict: true });
AdminOTPSchema.index({ ttlExpiresAt: 1 }, { expireAfterSeconds: 0 });
AdminOTPSchema.index({ email: 1, createdAt: -1 });

export const AdminOTP = mongoose.models.AdminOTP || mongoose.model('AdminOTP', AdminOTPSchema);

/**
 * Rate Limit Schema with TTL index for automatic cleanup
 * Setup: db.ratelimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
 */
const RateLimitSchema = new mongoose.Schema({
    identifier: { type: String, required: true },
    action: { type: String, required: true, enum: ['login', 'register', 'password-reset'] },
    windowStart: { type: Date, required: true },
    count: { type: Number, required: true, default: 1 },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
}, { strict: true, timestamps: true });

// TTL index for automatic cleanup - MUST be created in MongoDB
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RateLimitSchema.index({ identifier: 1, action: 1, windowStart: 1 });

export const RateLimit = mongoose.models.RateLimit || mongoose.model('RateLimit', RateLimitSchema);

