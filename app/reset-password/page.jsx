"use client";

import { useState } from "react";
import Link from "next/link";
import AuthLayout from "@/app/components/AuthLayout";
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
    <AuthLayout
      title="Reset Password"
      subtitle={
        sent
          ? `If an account exists for ${email.trim()}, a password reset link has been sent.`
          : "Enter your email and we'll send you a link to reset your password"
      }
    >
        {error && (
          <div className="p-3.5 text-sm text-danger bg-danger-soft border border-danger/20 rounded-xl">
            {error}
          </div>
        )}

        {sent ? (
          <Link
            href="/sign-in"
            className="tk-pill-btn tk-btn-primary w-full"
          >
            Back to Sign In
          </Link>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="tk-input"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="tk-pill-btn tk-btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending Link..." : "Send Reset Link"}
            </button>

            <div className="text-center pt-2">
              <Link href="/sign-in" className="text-sm font-medium text-muted hover:text-accent transition-colors">
                ← Back to Sign In
              </Link>
            </div>
          </form>
        )}
    </AuthLayout>
  );
}
