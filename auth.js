import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDb, User } from "@/app/lib/mongoose";
import { checkRateLimit, getCompositeKey, RATE_LIMIT_CONFIGS } from "@/app/lib/rate-limit";

// Track failed attempts for progressive delay (stored in DB via rate limit collection)
const PROGRESSIVE_DELAYS = [0, 0, 0, 1000, 2000, 4000, 8000]; // ms delays for attempts 1-6
const HARD_LOCKOUT_THRESHOLD = 7;
const HARD_LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 14 * 24 * 60 * 60, // 14 days
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, req) => {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        // Get client IP for rate limiting
        const ip = req?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req?.headers?.get("x-real-ip") || 
                   "unknown";
        const email = credentials.email.toString().toLowerCase().trim();
        const compositeKey = getCompositeKey(ip, email);

        // Check rate limit (5 per hour per IP+email)
        const rateLimitResult = await checkRateLimit(
          compositeKey,
          "login",
          RATE_LIMIT_CONFIGS.LOGIN.limit,
          RATE_LIMIT_CONFIGS.LOGIN.windowMs
        );

        if (!rateLimitResult.allowed) {
          // Check if this is a hard lockout scenario (7+ attempts)
          if (rateLimitResult.retryAfter && rateLimitResult.retryAfter > 3600) {
            throw new Error("Too many failed attempts. Account temporarily locked. Try again in 15 minutes.");
          }
          throw new Error(`Too many failed attempts. Please try again in ${Math.ceil(rateLimitResult.retryAfter / 60)} minutes.`);
        }

        await connectDb();
        const user = await User.findOne({ email }).select("+passwordHash");

        if (!user) {
          throw new Error("Invalid credentials");
        }

        if (!user.passwordHash) {
          throw new Error("Invalid credentials");
        }

        const isMatch = await bcrypt.compare(credentials.password.toString(), user.passwordHash);
        if (!isMatch) {
          // Progressive delay based on attempt count
          const attemptCount = RATE_LIMIT_CONFIGS.LOGIN.limit - rateLimitResult.remaining + 1;
          if (attemptCount >= HARD_LOCKOUT_THRESHOLD) {
            throw new Error("Too many failed attempts. Account temporarily locked. Try again in 15 minutes.");
          }
          
          const delayMs = PROGRESSIVE_DELAYS[Math.min(attemptCount, PROGRESSIVE_DELAYS.length - 1)];
          if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
          
          throw new Error("Invalid credentials");
        }

        user.lastLoginAt = new Date();
        await user.save();

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.displayName || "",
          image: user.photoURL || null,
        };
      },
    }),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await connectDb();
        const cleanEmail = user.email?.toLowerCase().trim();
        if (!cleanEmail) return false;

        let dbUser = await User.findOne({
          $or: [{ googleId: account.providerAccountId }, { email: cleanEmail }],
        });

        if (!dbUser) {
          dbUser = await User.create({
            email: cleanEmail,
            googleId: account.providerAccountId,
            displayName: user.name || "",
            photoURL: user.image || "",
            lastLoginAt: new Date(),
          });
        } else {
          let changed = false;
          if (!dbUser.googleId) {
            dbUser.googleId = account.providerAccountId;
            changed = true;
          }
          if (!dbUser.photoURL && user.image) {
            dbUser.photoURL = user.image;
            changed = true;
          }
          if (!dbUser.displayName && user.name) {
            dbUser.displayName = user.name;
            changed = true;
          }
          dbUser.lastLoginAt = new Date();
          changed = true;
          if (changed) await dbUser.save();
        }

        user.id = dbUser._id.toString();
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id || token.sub;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
});
