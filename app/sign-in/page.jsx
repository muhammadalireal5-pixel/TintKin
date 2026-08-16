"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/app/lib/firebase/client";
import { checkOnboardingStatus } from "@/app/lib/actions";
import Link from "next/link";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const token = await userCredential.user.getIdToken();
      const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Lax${secureFlag}`;

      try {
        const { complete } = await checkOnboardingStatus();
        window.location.href = complete ? "/dashboard" : "/onboarding";
      } catch (err) {
        window.location.href = "/onboarding";
      }
    } catch (err) {
      console.error("Sign in error:", err);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        setError("Invalid email or password. Please check your credentials or reset your password.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please reset your password or try again in a few minutes.");
      } else if (err.code === "auth/network-request-failed") {
        setError("Network error. Please check your internet connection.");
      } else {
        setError(err.message || "Failed to sign in. Please try again.");
      }
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const targetEmail = (resetEmail || email).trim();
    if (!targetEmail) {
      setError("Please enter your email address to receive a reset link.");
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setSuccessMessage(`Password reset email sent to ${targetEmail}. Check your inbox and spam folder.`);
      setResetLoading(false);
    } catch (err) {
      console.error("Password reset error:", err);
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email address.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError(err.message || "Failed to send reset email. Please try again.");
      }
      setResetLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-base px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 tk-glass p-6 sm:p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        
        <div className="text-center">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-lavender text-primary shadow-sm mb-4">✦</span>
          <h2 className="text-2xl sm:text-3xl font-display font-medium tracking-tight text-primary">
            {isResetMode ? "Reset Password" : "Welcome back"}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {isResetMode
              ? "Enter your email and we'll send you a link to reset your password"
              : "Sign in to continue your skin wellness journey"}
          </p>
        </div>

        {error && (
          <div className="p-3.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl">
            {successMessage}
          </div>
        )}

        {isResetMode ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email"
                required
                value={resetEmail || email}
                onChange={(e) => setResetEmail(e.target.value)}
                className="block w-full px-4 py-2.5 text-gray-900 border border-gray-200 rounded-xl bg-gray-50/50 focus:ring-primary focus:border-primary text-sm transition-colors"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={resetLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {resetLoading ? "Sending Link..." : "Send Reset Link"}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsResetMode(false);
                setError("");
                setSuccessMessage("");
              }}
              className="w-full text-center text-sm font-medium text-gray-600 hover:text-primary transition-colors pt-2"
            >
              ← Back to Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-2.5 text-gray-900 border border-gray-200 rounded-xl bg-gray-50/50 focus:ring-primary focus:border-primary text-sm transition-colors"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(true);
                    setResetEmail(email);
                    setError("");
                    setSuccessMessage("");
                  }}
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-4 py-2.5 text-gray-900 border border-gray-200 rounded-xl bg-gray-50/50 focus:ring-primary focus:border-primary text-sm transition-colors"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        )}

        {!isResetMode && (
          <p className="text-center text-sm text-gray-600 pt-2">
            Don't have an account?{" "}
            <Link href="/sign-up" className="font-medium text-primary hover:text-primary/80">
              Sign up
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

