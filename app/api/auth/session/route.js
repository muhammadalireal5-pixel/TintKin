import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/app/lib/firebase/admin";
import { okResult, errorResult } from "@/lib/utils/result";
import { ERROR_CODES } from "@/lib/constants/status";

// 14 days in milliseconds (Firebase maximum session cookie lifetime)
const SESSION_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000;
const SESSION_EXPIRY_SECS = 14 * 24 * 60 * 60;

export async function POST(request) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json(
        errorResult(ERROR_CODES.UNAUTHORIZED, "Missing idToken in request"),
        { status: 400 }
      );
    }

    if (!adminAuth) {
      return NextResponse.json(
        errorResult(ERROR_CODES.ANALYSIS_FAILED, "Firebase Admin SDK not initialized"),
        { status: 500 }
      );
    }

    // Verify raw client ID token first
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Mint authentic Firebase Session Cookie (14 days)
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRY_MS,
    });

    const cookieStore = await cookies();
    cookieStore.set("__session", sessionCookie, {
      maxAge: SESSION_EXPIRY_SECS,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.json(okResult({ uid: decodedToken.uid }));
  } catch (error) {
    return NextResponse.json(
      errorResult(ERROR_CODES.UNAUTHORIZED, "Failed to create session cookie"),
      { status: 401 }
    );
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.set("__session", "", {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.json(okResult({ message: "Session cleared" }));
  } catch {
    return NextResponse.json(
      errorResult(ERROR_CODES.ANALYSIS_FAILED, "Failed to clear session"),
      { status: 500 }
    );
  }
}
