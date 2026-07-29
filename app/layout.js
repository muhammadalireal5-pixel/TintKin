import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { Outfit, Playfair_Display } from "next/font/google";
import Link from "next/link";
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

export const metadata = {
  title: "TintKin — Wellness Journal",
  description: "Understand your skin's true potential. Upload a selfie and get instant AI-powered skin analysis, aging projections, and personalized insights.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} ${playfair.variable}`}>
      <body className="tk-body">
        <ClerkProvider>
          {/* ── Header ───────────────────────────────────────── */}
          <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-md border-b border-white/20 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4 overflow-hidden">

              {/* Logo */}
              <Link href="/" className="flex items-center gap-1.5 flex-shrink-0 text-primary hover:opacity-80 transition-opacity min-w-0">
                <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-lavender text-primary shadow-[0_4px_14px_rgba(230,230,250,0.8)] flex-shrink-0">✦</span>
                <span className="text-lg sm:text-2xl font-bold font-display tracking-tight text-primary truncate">TintKin</span>
              </Link>

              {/* Nav – scrollable on tiny phones */}
              <nav className="flex items-center gap-0.5 sm:gap-2 overflow-x-auto scrollbar-none flex-1 justify-center min-w-0 px-1">
                <Show when="signed-in">
                  <Link href="/dashboard" className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium text-muted hover:text-primary hover:bg-black/5 transition-all whitespace-nowrap flex-shrink-0">Dashboard</Link>
                  <Link href="/capture" className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium text-muted hover:text-primary hover:bg-black/5 transition-all whitespace-nowrap flex-shrink-0">Scan</Link>
                  <Link href="/time-machine" className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium text-muted hover:text-primary hover:bg-black/5 transition-all whitespace-nowrap flex-shrink-0">Time&nbsp;Machine</Link>
                  <Link href="/what-if" className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium text-muted hover:text-primary hover:bg-black/5 transition-all whitespace-nowrap flex-shrink-0">What-If</Link>
                </Show>
              </nav>

              {/* Auth */}
              <div className="flex gap-1.5 sm:gap-3 items-center flex-shrink-0">
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="tk-pill-btn tk-btn-ghost text-xs sm:text-sm px-3 sm:px-5 py-1.5 sm:py-2.5 whitespace-nowrap">Sign In</button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="tk-pill-btn tk-btn-primary text-xs sm:text-sm px-3 sm:px-5 py-1.5 sm:py-2.5 shadow-[0_4px_14px_rgba(44,62,80,0.15)] whitespace-nowrap">Start</button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <div className="rounded-full p-1 bg-lavender shadow-[0_4px_14px_rgba(230,230,250,0.6)] flex-shrink-0">
                    <div className="rounded-full overflow-hidden bg-base">
                      <UserButton />
                    </div>
                  </div>
                </Show>
              </div>
            </div>
          </header>

          {/* ── Page Content ─────────────────────────────────── */}
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}