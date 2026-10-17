"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import AuthLayout from "@/app/components/AuthLayout";
import BrandLoader from "@/app/components/BrandLoader";
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
      <BrandLoader message="Verifying session…" />
    );
  }

  if (success) {
    return (
      <AuthLayout title="Password Reset Successful!" subtitle="Redirecting you to sign in with your new password...">
        <div className="flex justify-center">
          <span className="tk-icon-circle w-14 h-14 bg-success-soft text-success"><CheckCircle2 className="w-7 h-7" /></span>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set New Password" subtitle="Choose a secure new password for your account">
        {error && (
          <div className="p-3.5 text-sm text-danger bg-danger-soft border border-danger/20 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="tk-input pr-11"
                placeholder="••••••••••••"
                autoComplete="new-password"
                minLength={12}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-muted focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-muted">Must be at least 12 characters. Avoid common passwords.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="tk-input"
              placeholder="••••••••••••"
              autoComplete="new-password"
              minLength={12}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="tk-pill-btn tk-btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>

          <div className="text-center pt-2">
            <Link href="/sign-in" className="text-sm font-medium text-muted hover:text-accent transition-colors">
              ← Back to Sign In
            </Link>
          </div>
        </form>
    </AuthLayout>
  );
}
