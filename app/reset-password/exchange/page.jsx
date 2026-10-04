import { KeyRound, XCircle } from "lucide-react";
import Link from "next/link";
import { exchangeResetToken } from "./actions";

const STATUS_MESSAGES = {
  invalid: "Reset link is invalid or has expired. Please request a new one.",
  error: "An unexpected error occurred. Please try again.",
};

export default async function ExchangePage({ searchParams }) {
  const { token, status } = (await searchParams) || {};

  if (status || !token || typeof token !== "string") {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-base px-4 py-8">
        <div className="w-full max-w-md p-8 tk-glass rounded-2xl shadow-sm text-center">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-red-600 mb-2">
            {status ? "Invalid or Expired Link" : "Invalid Reset Link"}
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            {STATUS_MESSAGES[status] || "The password reset link is missing required parameters."}
          </p>
          <Link
            href="/reset-password"
            className="inline-block w-full bg-primary text-white py-3 rounded-xl hover:bg-primary/90 transition"
          >
            Request New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-base px-4 py-8">
      <form action={exchangeResetToken} className="w-full max-w-md p-8 tk-glass rounded-2xl shadow-sm text-center">
        <input type="hidden" name="token" value={token} />
        <KeyRound className="w-12 h-12 text-sage mx-auto mb-4" />
        <h2 className="text-xl font-medium text-primary mb-2">Reset Your Password</h2>
        <p className="text-sm text-gray-600 mb-6">
          Continue to choose a new password. This link can only be used once.
        </p>
        <button
          type="submit"
          className="inline-block w-full bg-primary text-white py-3 rounded-xl hover:bg-primary/90 transition"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
