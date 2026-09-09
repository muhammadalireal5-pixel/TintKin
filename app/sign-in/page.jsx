"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { checkOnboardingStatus } from "@/app/lib/actions";
import { requestPasswordReset } from "@/app/lib/auth-actions";
import { useAuthContext } from "@/app/context/AuthContext";
import Link from "next/link";
import { Eye, EyeOff, Sparkles } from "lucide-react";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuthContext();
  const requestedRedirect = searchParams.get("redirect");
  const redirectTarget =
    requestedRedirect?.startsWith("/") &&
    !requestedRedirect.startsWith("//") &&
    !requestedRedirect.includes("\\")
      ? requestedRedirect
      : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const noticeParam = searchParams.get("notice");
  const [successMessage, setSuccessMessage] = useState("");
  const activeSuccessMessage =
    successMessage ||
    (noticeParam === "account_created"
      ? "Account created successfully! Please sign in with your email and password."
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
        if (res.error === "CredentialsSignin" || res.code === "credentials") {
          setError("Invalid email or password. Please check your credentials or reset your password.");
        } else {
          setError(res.error || "Invalid email or password.");
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
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-base px-4 py-8">
        <div className="flex flex-col items-center gap-3 tk-glass p-8 rounded-2xl shadow-sm text-center">
          <Sparkles className="w-8 h-8 text-sage animate-spin stroke-[1.5]" />
          <p className="text-sm font-medium text-primary">Opening your skin journal...</p>
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

        {activeSuccessMessage && (
          <div className="p-3.5 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl">
            {activeSuccessMessage}
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
          <div className="space-y-4">
            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-all disabled:opacity-50"
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
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#FAF9F6] px-2 text-muted">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input
                  type="email"
                  name="email"
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
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-2.5 pr-10 text-gray-900 border border-gray-200 rounded-xl bg-gray-50/50 focus:ring-primary focus:border-primary text-sm transition-colors"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? "Signing in..." : "Sign In with Email"}
              </button>
            </form>
          </div>
        )}

        {!isResetMode && (
          <p className="text-center text-sm text-gray-600 pt-2">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="font-medium text-primary hover:text-primary/80">
              Sign up
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-base px-4 py-8">
          <div className="flex flex-col items-center gap-3 tk-glass p-8 rounded-2xl shadow-sm text-center">
            <Sparkles className="w-8 h-8 text-sage animate-spin stroke-[1.5]" />
            <p className="text-sm font-medium text-primary">Loading sign in...</p>
          </div>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
