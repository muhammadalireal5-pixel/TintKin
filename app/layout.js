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
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-6">
              
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 flex-shrink-0 text-primary hover:opacity-80 transition-opacity">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-lavender text-primary shadow-[0_4px_14px_rgba(230,230,250,0.8)]">✦</span>
                <span className="text-2xl font-bold font-display tracking-tight text-primary">TintKin</span>
              </Link>

              {/* Nav */}
              <nav className="flex items-center gap-2">
                <Show when="signed-in">
                  <Link href="/dashboard" className="px-4 py-2 rounded-full text-sm font-medium text-muted hover:text-primary hover:bg-black/5 transition-all">Dashboard</Link>
                  <Link href="/capture" className="px-4 py-2 rounded-full text-sm font-medium text-muted hover:text-primary hover:bg-black/5 transition-all">Scan</Link>
                  <Link href="/time-machine" className="px-4 py-2 rounded-full text-sm font-medium text-muted hover:text-primary hover:bg-black/5 transition-all">Time Machine</Link>
                  <Link href="/what-if" className="px-4 py-2 rounded-full text-sm font-medium text-muted hover:text-primary hover:bg-black/5 transition-all">What-If</Link>
                </Show>
              </nav>

              {/* Auth */}
              <div className="flex gap-3 items-center flex-shrink-0">
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="tk-pill-btn tk-btn-ghost text-sm">Sign In</button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="tk-pill-btn tk-btn-primary text-sm shadow-[0_4px_14px_rgba(44,62,80,0.15)]">Get Started</button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <div className="rounded-full p-1 bg-lavender shadow-[0_4px_14px_rgba(230,230,250,0.6)]">
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