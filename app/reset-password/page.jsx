"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { requestPasswordReset } from "@/app/lib/auth-actions";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const targetEmail = email.trim();
    if (!targetEmail) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(targetEmail);
      setSent(true);
    } catch {
      setError("Something went wrong, please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-base px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 tk-glass p-6 sm:p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="text-center">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-lavender text-primary shadow-sm mb-4">
            {sent ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <Sparkles className="w-6 h-6" />}
          </span>
          <h2 className="text-2xl sm:text-3xl font-display font-medium tracking-tight text-primary">
            Reset Password
          </h2>
          <p className="mt-2 text-sm text-muted">
            {sent
              ? `If an account exists for ${email.trim()}, a password reset link has been sent.`
              : "Enter your email and we'll send you a link to reset your password"}
          </p>
        </div>

        {error && (
          <div className="p-3.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        {sent ? (
          <Link
            href="/sign-in"
            className="block w-full text-center py-2.5 px-4 rounded-xl shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-all"
          >
            Back to Sign In
          </Link>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "Sending Link..." : "Send Reset Link"}
            </button>

            <div className="text-center pt-2">
              <Link href="/sign-in" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
                ← Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
