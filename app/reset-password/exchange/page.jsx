import { KeyRound, XCircle } from "lucide-react";
import Link from "next/link";
import AuthLayout from "@/app/components/AuthLayout";
import { exchangeResetToken } from "./actions";

const STATUS_MESSAGES = {
  invalid: "Reset link is invalid or has expired. If you requested more than one reset email, only the most recently sent link works — check your inbox for a newer one, or request a fresh link below.",
  error: "An unexpected error occurred. Please try again.",
};

export default async function ExchangePage({ searchParams }) {
  const { token, status } = (await searchParams) || {};

  if (status || !token || typeof token !== "string") {
    return (
      <AuthLayout
        title={status ? "Invalid or Expired Link" : "Invalid Reset Link"}
        subtitle={STATUS_MESSAGES[status] || "The password reset link is missing required parameters."}
      >
        <div className="flex justify-center">
          <span className="tk-icon-circle w-14 h-14 bg-danger-soft text-danger"><XCircle className="w-7 h-7" /></span>
        </div>
        <Link href="/reset-password" className="tk-pill-btn tk-btn-primary w-full">
          Request New Reset Link
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset Your Password" subtitle="Continue to choose a new password. This link can only be used once.">
      <form action={exchangeResetToken} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <div className="flex justify-center">
          <span className="tk-icon-circle w-14 h-14 bg-accent-soft text-accent"><KeyRound className="w-7 h-7" /></span>
        </div>
        <button type="submit" className="tk-pill-btn tk-btn-primary w-full">
          Continue
        </button>
      </form>
    </AuthLayout>
  );
}
