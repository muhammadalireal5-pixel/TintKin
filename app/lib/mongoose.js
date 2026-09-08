import "server-only";
import mongoose from 'mongoose';

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
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
        cached.promise = mongoose.connect(process.env.MONGODB_URI, opts)
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
    firebaseUid: { type: String, unique: true, sparse: true, index: true },
    email: { type: String, index: true },
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
      city: String
    },
    photoPrivacy: { type: String, enum: ['store', 'delete'], default: 'store' },
    baselineSelfie: { type: String, default: null }
}, { strict: true });

const SelfieSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    imageUrl: String,
    isAnalyzed: { type: Boolean, default: true },
    takenAt: { type: Date, default: Date.now, index: true },
    overallScore: Number,
    skinAge: Number,
    scores: { wrinkles: Number, firmness: Number, spots: Number, radiance: Number },
    critique: String,
    habits: [String],
    facialWorkout: String,
    amRoutine: [String],
    pmRoutine: [String],
    recommendedProducts: {
      type: [{
        type: { type: String, enum: ["Cleanser", "Serum", "Moisturizer", "Sunscreen", "Exfoliant"] },
        formula: { type: String, required: true },
        description: { type: String, required: true }
      }],
      validate: {
        validator: function(v) { return !this.isAnalyzed || (Array.isArray(v) && v.length === 3); },
        message: 'Exactly 3 recommended products are required for analyzed selfies.'
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

