"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Sparkles, CheckCircle2 } from "lucide-react";
import { submitNewPassword } from "./actions";

export default function ResetPasswordFormPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const router = useRouter();

  // Check for reset-session cookie on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/reset-password/form/verify", { method: "POST" });
        const data = await res.json();
        if (!data.valid) {
          router.push("/reset-password");
        } else {
          setVerified(true);
        }
      } catch {
        router.push("/reset-password");
      }
    };
    checkSession();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 12) {
      setError("Password must be at least 12 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await submitNewPassword(newPassword);
      if (!res.success) {
        setError(res.error || "Failed to reset password.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/sign-in");
        }, 2000);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!verified) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-base px-4 py-8">
        <div className="flex flex-col items-center gap-3 tk-glass p-8 rounded-2xl shadow-sm text-center">
          <Sparkles className="w-8 h-8 text-sage animate-spin stroke-[1.5]" />
          <p className="text-sm font-medium text-primary">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-base px-4 py-8">
        <div className="w-full max-w-md text-center p-8 tk-glass rounded-2xl shadow-sm space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h2 className="text-2xl font-display font-medium text-primary">Password Reset Successful!</h2>
          <p className="text-sm text-muted">Redirecting you to sign in with your new password...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-base px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 tk-glass p-6 sm:p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="text-center">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-lavender text-primary shadow-sm mb-4">✦</span>
          <h2 className="text-2xl sm:text-3xl font-display font-medium tracking-tight text-primary">
            Set New Password
          </h2>
          <p className="mt-2 text-sm text-muted">
            Choose a secure new password for your account
          </p>
        </div>

        {error && (
          <div className="p-3.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="block w-full px-4 py-2.5 pr-10 text-gray-900 border border-gray-200 rounded-xl bg-gray-50/50 focus:ring-primary focus:border-primary text-sm transition-colors"
                placeholder="••••••••••••"
                autoComplete="new-password"
                minLength={12}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">Must be at least 12 characters. Avoid common passwords.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="block w-full px-4 py-2.5 text-gray-900 border border-gray-200 rounded-xl bg-gray-50/50 focus:ring-primary focus:border-primary text-sm transition-colors"
              placeholder="••••••••••••"
              autoComplete="new-password"
              minLength={12}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>

          <div className="text-center pt-2">
            <Link href="/sign-in" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
              ← Back to Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
