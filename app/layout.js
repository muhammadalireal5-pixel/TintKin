import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { Outfit } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "TintKin — AI Skincare Analysis",
  description: "Understand your skin's true potential. Upload a selfie and get instant AI-powered skin analysis, aging projections, and personalized insights.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="tk-body">
        <ClerkProvider>

          {/* ── Header ───────────────────────────────────────── */}
          <header className="tk-header">
            {/* Gradient glow line at very top */}
            <div className="tk-header-glow-line" />

            <div className="tk-header-inner">

              {/* Logo */}
              <Link href="/" className="tk-logo">
                <span className="tk-logo-icon">✦</span>
                <span className="tk-logo-text">TintKin</span>
              </Link>

              {/* Nav */}
              <nav className="tk-nav">
                <Show when="signed-in">
                  <Link href="/dashboard" className="tk-nav-link">Dashboard</Link>
                  <Link href="/capture" className="tk-nav-link">Scan</Link>
                  <Link href="/time-machine" className="tk-nav-link">Time Machine</Link>
                  <Link href="/what-if" className="tk-nav-link">What-If</Link>
                </Show>
              </nav>

              {/* Auth */}
              <div className="tk-auth-group">
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="tk-btn-sign-in">Sign In</button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="tk-btn-sign-up">Get Started</button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <div className="tk-user-ring">
                    <div className="tk-user-ring-inner">
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