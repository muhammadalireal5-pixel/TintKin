"use client";

import { useState } from "react";
import { resendVerificationEmail } from "@/app/lib/auth-actions";
import { Mail } from "lucide-react";

export default function EmailVerificationBanner({ user }) {
  const [state, setState] = useState("idle"); // idle | sending | sent

  // Google sign-ups are already verified by the OAuth provider, and the
  // field is simply absent on legacy accounts from before M21 — only an
  // explicit `false` means a credentials sign-up that hasn't confirmed yet.
  if (user?.emailVerified !== false) return null;

  const handleResend = async () => {
    if (state === "sending") return;
    setState("sending");
    try {
      await resendVerificationEmail();
    } finally {
      setState("sent");
    }
  };

  return (
    <div className="mb-6 p-4 sm:p-5 bg-amber-50 border border-amber-200 rounded-3xl shadow-xs tk-anim-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 text-amber-700 mt-0.5">
            <Mail size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-display font-semibold text-primary">
              Please confirm your email address
            </h3>
            <p className="text-xs text-amber-800 max-w-xl mt-0.5 leading-relaxed">
              {state === "sent"
                ? "Confirmation email sent — check your inbox (and spam folder)."
                : `We sent a confirmation link to ${user?.email || "your email"} when you signed up. Didn't get it?`}
            </p>
          </div>
        </div>
        {state !== "sent" && (
          <button
            onClick={handleResend}
            disabled={state === "sending"}
            className="shrink-0 px-3.5 py-1.5 bg-amber-800 text-white text-xs font-semibold rounded-xl hover:bg-amber-900 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {state === "sending" ? "Sending…" : "Resend Email"}
          </button>
        )}
      </div>
    </div>
  );
}
