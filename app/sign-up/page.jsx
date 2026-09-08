"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/app/lib/firebase/client";
import { setSessionCookie } from "@/lib/utils/auth-cookie";
import { useAuthContext } from "@/app/context/AuthContext";
import Link from "next/link";
import { Eye, EyeOff, Sparkles } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthContext();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(userCredential.user, { displayName: name.trim() });
      const token = await userCredential.user.getIdToken();
      setSessionCookie(token);
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      }).catch(() => {});
      window.location.href = "/onboarding";
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please sign in instead.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Please use at least 6 characters.");
      } else {
        setError("Something went wrong, please try again later.");
      }
      setLoading(false);
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
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-base px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 tk-glass p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        
        <div className="text-center">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-lavender text-primary shadow-sm mb-4">✦</span>
          <h2 className="text-3xl font-display font-medium tracking-tight text-primary">
            Create an account
          </h2>
          <p className="mt-2 text-sm text-muted">
            Start your skincare wellness journey today
          </p>
        </div>

        <div className="mt-8 space-y-6">

          <form onSubmit={onSubmit} method="POST" action="#" className="space-y-5">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full px-4 py-2.5 text-gray-900 border border-gray-200 rounded-xl bg-gray-50/50 focus:ring-primary focus:border-primary sm:text-sm transition-colors"
                placeholder="Jane Doe"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-2.5 text-gray-900 border border-gray-200 rounded-xl bg-gray-50/50 focus:ring-primary focus:border-primary sm:text-sm transition-colors"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-2.5 pr-10 text-gray-900 border border-gray-200 rounded-xl bg-gray-50/50 focus:ring-primary focus:border-primary sm:text-sm transition-colors"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-medium text-primary hover:text-primary/80">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
