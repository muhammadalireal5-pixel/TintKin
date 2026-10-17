"use client";

import { useEffect } from "react";
import { Outfit, Playfair_Display } from "next/font/google";
import * as Sentry from "@sentry/nextjs";
import { AlertOctagon, RotateCcw } from "lucide-react";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className={`${outfit.variable} ${playfair.variable}`}>
      <head>
        <title>Application Error | TintKin</title>
      </head>
      <body className="tk-body tk-page min-h-screen flex items-center justify-center p-6">
        <div className="tk-card p-8 md:p-12 flex flex-col items-center text-center max-w-lg w-full">
          <div className="tk-icon-circle w-20 h-20 bg-danger-soft text-danger mb-8 tk-anim-float">
            <AlertOctagon className="w-10 h-10" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-semibold text-primary mb-4">
            Critical System Error
          </h1>
          
          <p className="text-muted leading-relaxed mb-8">
            The application encountered an unrecoverable error during layout rendering. We apologize for the interruption.
          </p>
          
          <button 
            onClick={() => reset()} 
            className="tk-pill-btn tk-btn-primary w-full gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
