import { Suspense } from "react";
import { Sparkles, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { exchangeResetToken } from "./actions";

export default async function ExchangePage({ searchParams }) {
  const token = searchParams?.token;

  if (!token) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-base px-4 py-8">
        <div className="w-full max-w-md p-8 tk-glass rounded-2xl shadow-sm text-center">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-red-600 mb-2">Invalid Reset Link</h2>
          <p className="text-sm text-gray-600 mb-6">
            The password reset link is missing required parameters.
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
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-3 tk-glass p-8 rounded-2xl shadow-sm text-center">
            <Sparkles className="w-8 h-8 text-sage animate-spin stroke-[1.5]" />
            <p className="text-sm font-medium text-primary">Verifying link...</p>
          </div>
        }
      >
        <ExchangeForm token={token} />
      </Suspense>
    </div>
  );
}

async function ExchangeForm({ token }) {
  const result = await exchangeResetToken(token);

  if (!result.success) {
    return (
      <div className="w-full max-w-md p-8 tk-glass rounded-2xl shadow-sm text-center">
        <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <h2 className="text-xl font-medium text-red-600 mb-2">Invalid or Expired Link</h2>
        <p className="text-sm text-gray-600 mb-6">{result.error}</p>
        <Link 
          href="/reset-password" 
          className="inline-block w-full bg-primary text-white py-3 rounded-xl hover:bg-primary/90 transition"
        >
          Request New Reset Link
        </Link>
      </div>
    );
  }

  // Token verified and consumed - redirect to clean form
  return (
    <div className="w-full max-w-md p-8 tk-glass rounded-2xl shadow-sm text-center">
      <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
      <h2 className="text-xl font-medium text-emerald-600 mb-2">Link Verified</h2>
      <p className="text-sm text-gray-600 mb-6">
        Redirecting you to set your new password...
      </p>
      <meta httpEquiv="refresh" content="1;url=/reset-password/form" />
      <noscript>
        <Link 
          href="/reset-password/form" 
          className="inline-block w-full bg-primary text-white py-3 rounded-xl hover:bg-primary/90 transition"
        >
          Continue to Password Form
        </Link>
      </noscript>
    </div>
  );
}
