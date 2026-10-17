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
    <div className="mb-6 p-4 sm:p-5 bg-accent-soft border border-accent/20 rounded-[1.25rem] tk-anim-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 tk-icon-circle bg-surface text-accent shrink-0 mt-0.5">
            <Mail size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-primary">
              Please confirm your email address
            </h3>
            <p className="text-xs text-muted max-w-xl mt-0.5 leading-relaxed">
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
            className="shrink-0 tk-pill-btn tk-btn-primary !px-4 !py-1.5 !text-xs disabled:opacity-50 cursor-pointer"
          >
            {state === "sending" ? "Sending…" : "Resend Email"}
          </button>
        )}
      </div>
    </div>
  );
}
