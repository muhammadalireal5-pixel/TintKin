import mongoose from 'mongoose'

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
}

const UserSchema = new mongoose.Schema({
    firebaseUid: {type: String, unique: true, sparse: true},
    email: {type: String},
    displayName: {type: String},
    photoURL: {type: String},
    lastLoginAt: {type: Date},
    createdAt: {type: Date, default: Date.now},
    birthDate: {type: Date},
    sex: {type: String},
    skinType: {type: String},
    goals: [String],
    customGoal: String,
    onboardingComplete: {type: Boolean, default: false},
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