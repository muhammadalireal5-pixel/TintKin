"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { checkOnboardingStatus } from "@/app/lib/actions";
import { requestPasswordReset } from "@/app/lib/auth-actions";
import { useAuthContext } from "@/app/context/AuthContext";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/app/components/AuthLayout";
import BrandLoader from "@/app/components/BrandLoader";
import { getSafeRedirect } from "@/lib/utils/redirect";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuthContext();
  const redirectTarget = getSafeRedirect(searchParams.get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const errorParam = searchParams.get("error");
  const activeErrorMessage =
    error ||
    (errorParam === "AccessDenied"
      ? "That Google account can't be linked to this sign-in. If you already have an account, try signing in with your email and password instead."
      : errorParam
      ? "We couldn't sign you in. Please try again."
      : "");
  const noticeParam = searchParams.get("notice");
  const [successMessage, setSuccessMessage] = useState("");
  const activeSuccessMessage =
    successMessage ||
    (noticeParam === "account_created"
      ? "If this email already had an account, we've sent a link to set a new password. Otherwise your account is ready: please sign in."
      : noticeParam === "session_expired"
      ? "Your session has ended. Please sign in again."
      : noticeParam === "email_verified"
      ? "Email confirmed! Please sign in."
      : noticeParam === "email_verify_failed"
      ? "That confirmation link is invalid or has expired. Please sign in and request a new one from your account settings."
      : "");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      router.replace(redirectTarget);
    }
  }, [user, authLoading, redirectTarget, router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (res?.error) {
        if (res.code === "rate_limited") {
          setError("Too many sign-in attempts. Please wait a few minutes and try again.");
        } else {
          // Covers "invalid_credentials", the legacy "credentials" code, and
          // any other CredentialsSignin code — never show a raw NextAuth
          // error type (e.g. "Configuration") to the user.
          setError("Invalid email or password. Please check your credentials or reset your password.");
        }
        setLoading(false);
        return;
      }

      try {
        const { complete } = await checkOnboardingStatus();
        window.location.href = complete ? redirectTarget : "/onboarding";
      } catch {
        window.location.href = redirectTarget;
      }
    } catch {
      setError("Something went wrong, please try again later.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: redirectTarget });
    } catch {
      setError("Failed to sign in with Google. Please try again.");
      setGoogleLoading(false);
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
      await requestPasswordReset(targetEmail);
      setSuccessMessage(`If an account exists for ${targetEmail}, a password reset link has been sent.`);
    } catch {
      setError("Something went wrong, please try again later.");
    } finally {
      setResetLoading(false);
    }
  };

  if (user && !authLoading) {
    return (
      <BrandLoader message="Opening your skin journal…" />
    );
  }

  return (
    <AuthLayout
      title={isResetMode ? "Reset Password" : "Welcome back"}
      subtitle={
        isResetMode
          ? "Enter your email and we'll send you a link to reset your password"
          : "Sign in to continue your skin wellness journey"
      }
      footer={
        !isResetMode && (
          <p className="text-center text-sm text-muted">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="font-semibold text-accent hover:text-accent-deep">
              Sign up
            </Link>
          </p>
        )
      }
    >
        {activeErrorMessage && (
          <div className="p-3.5 text-sm text-danger bg-danger-soft border border-danger/20 rounded-xl">
            {activeErrorMessage}
          </div>
        )}

        {activeSuccessMessage && (
          <div className="p-3.5 text-sm text-success bg-success-soft border border-success/20 rounded-xl">
            {activeSuccessMessage}
          </div>
        )}

        {isResetMode ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">Email address</label>
              <input
                type="email"
                required
                value={resetEmail || email}
                onChange={(e) => setResetEmail(e.target.value)}
                className="tk-input"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={resetLoading}
              className="tk-pill-btn tk-btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="w-full text-center text-sm font-medium text-muted hover:text-accent transition-colors pt-2"
            >
              ← Back to Sign In
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="tk-pill-btn tk-btn-ghost w-full gap-3 bg-paper disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              {googleLoading ? "Connecting to Google..." : "Continue with Google"}
            </button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-line" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface px-2 text-muted">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Email address</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="tk-input"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-primary">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(true);
                      setResetEmail(email);
                      setError("");
                      setSuccessMessage("");
                    }}
                    className="text-xs font-medium text-accent hover:text-accent-deep transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="tk-input pr-11"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="tk-pill-btn tk-btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign In with Email"}
              </button>
            </form>
          </div>
        )}

    </AuthLayout>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <BrandLoader message="Loading sign in…" />
      }
    >
      <SignInForm />
    </Suspense>
  );
}
