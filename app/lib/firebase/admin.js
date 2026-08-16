import admin from "firebase-admin";
import { cookies } from "next/headers";

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  } catch (error) {
    console.warn("Firebase admin initialization failed (this is expected during build if env vars are missing).");
  }
}

export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("__session")?.value;
  if (!token) throw new Error("Unauthorized: No session token");

  if (!adminAuth) throw new Error("Firebase Admin SDK not initialized");

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded; // { uid, email, name, picture, ... }
  } catch (err) {
    throw new Error("Unauthorized: Invalid token");
  }
}
