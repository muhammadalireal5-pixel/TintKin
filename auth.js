import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDb, User } from "@/app/lib/mongoose";

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
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        await connectDb();
        const cleanEmail = credentials.email.toString().toLowerCase().trim();
        const user = await User.findOne({ email: cleanEmail }).select("+passwordHash");

        if (!user) {
          throw new Error("Invalid credentials");
        }

        if (!user.passwordHash) {
          throw new Error("No password set for this account. Please sign in with Google or reset your password.");
        }

        const isMatch = await bcrypt.compare(credentials.password.toString(), user.passwordHash);
        if (!isMatch) {
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
