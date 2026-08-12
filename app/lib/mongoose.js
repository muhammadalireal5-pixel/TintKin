import mongoose from 'mongoose'

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export const connectDb = async () => {
    if(cached.conn) return cached.conn
    if(!cached.promise) {
        cached.promise = mongoose.connect(process.env.MONGODB_URI)
    }
    cached.conn = await cached.promise
    return cached.conn
}

connectDb()

const UserSchema = new mongoose.Schema({
    clerkId: {type: String, unique:true, required:true},
    birthDate: {type: Date, required: true},
    sex: {type: String, required: true},
    skinType: {type: String},
    goals: [String],
    customGoal: String,
    onboardingComplete: {type: Boolean, default: false},
    baselineSelfie: String,
    recommendationsLockedUntil: { type: Date, default: null },
    workoutLockedUntil: { type: Date, default: null },
    isSubscribed: { type: Boolean, default: false },
    subscribedAt: { type: Date, default: null },
});

const SelfieSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    imageUrl: String,
    takenAt: { type: Date, default: Date.now },
    overallScore: Number,
    skinAge: Number,
    scores: { wrinkles: Number, firmness: Number, spots: Number, radiance: Number },
    maskUrls: Object,
    youCamTaskId: String,
    critique: String,
    habits: [String],
    facialWorkout: String,
    recommendedProducts: {
    type: [{
      type: { type: String, enum: ["Cleanser", "Serum", "Moisturizer", "Sunscreen", "Exfoliant"] },
      formula: { type: String, required: true },
      description: { type: String, required: true }
    }],
    validate: {
      validator: function(v) { return Array.isArray(v) && v.length === 3; },
      message: 'Exactly 3 recommended products are required.'
    }
    }
});


const LifestyleSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    date: { type: Date, default: Date.now },
    sleepHours: Number,
    spfUsed: Boolean,
    uvMinutes: Number,
    sugarServings: Number,
});

const SimulationSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    name: String,
    scenarioA: Object,
    scenarioB: Object,
    deltas: Object,
    targetAge: Number,
    resultA: Object,
    resultB: Object,
    createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Selfie = mongoose.models.Selfie || mongoose.model('Selfie', SelfieSchema);
export const Lifestyle = mongoose.models.Lifestyle || mongoose.model('Lifestyle', LifestyleSchema);
export const Simulation = mongoose.models.Simulation || mongoose.model('Simulation', SimulationSchema);