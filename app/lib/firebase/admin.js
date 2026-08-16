import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";

if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  } catch (error) {
    console.warn("Firebase admin initialization failed (this is expected during build if env vars are missing).");
  }
}

export const adminAuth = getApps().length > 0 ? getAuth() : null;

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("__session")?.value;
  if (!token) throw new Error("Unauthorized: No session token");

  if (!adminAuth) throw new Error("Firebase Admin SDK not initialized");

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded;
  } catch (err) {
    throw new Error("Unauthorized: Invalid token");
  }
}
