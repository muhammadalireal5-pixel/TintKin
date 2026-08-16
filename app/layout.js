import { AuthProvider } from "./context/AuthContext";
import { HeaderAuth } from "./components/HeaderAuth";
import { Outfit, Playfair_Display } from "next/font/google";
import Link from "next/link";
import { ToastProvider } from "./components/ToastProvider";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://tintkin.com"),
  title: {
    template: "%s | TintKin",
    default: "TintKin — Wellness Journal",
  },
  icons: {
    icon: "/favicon.png",
  },
  description: "Understand your skin's true potential. Upload a selfie and get instant AI-powered skin analysis, what-if simulations, and personalized insights.",
  openGraph: {
    title: "TintKin — Wellness Journal",
    description: "Understand your skin's true potential. Upload a selfie and get instant AI-powered skin analysis.",
    url: "https://tintkin.com",
    siteName: "TintKin",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "TintKin Open Graph Image",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TintKin — Wellness Journal",
    description: "Understand your skin's true potential. Upload a selfie and get instant AI-powered skin analysis.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} ${playfair.variable}`}>
      <body className="tk-body">
        <AuthProvider>
          <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-md border-b border-white/20 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-20 flex items-center justify-between gap-1.5 sm:gap-4">

              {/* Logo */}
              <Link href="/" className="flex items-center gap-1.5 flex-shrink-0 text-primary hover:opacity-80 transition-opacity min-w-0">
                <img src="/icon.png" alt="TintKin Logo" className="w-32 sm:w-48 md:w-72 h-auto object-contain -ml-2" />
              </Link>

              <HeaderAuth />
            </div>
          </header>

          <ToastProvider>
            {children}
          </ToastProvider>

          <footer className="mt-auto border-t border-black/5 bg-base/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-lavender text-primary shadow-[0_2px_8px_rgba(230,230,250,0.8)] flex-shrink-0 text-[10px]">✦</span>
                <span className="text-sm font-display text-primary font-medium">© {new Date().getFullYear()} TintKin. All rights reserved.</span>
              </div>
              <div className="flex items-center gap-6">
                <Link href="/privacy" className="text-sm text-muted hover:text-primary transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="text-sm text-muted hover:text-primary transition-colors">Terms of Service</Link>
                <a href="mailto:support@tintkin.com" className="text-sm text-muted hover:text-primary transition-colors">Contact</a>
              </div>
            </div>
          </footer>

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebApplication",
                name: "TintKin",
                url: "https://tintkin.com",
                description: "AI-powered skincare wellness journal and analysis.",
                applicationCategory: "HealthAndFitnessApplication",
                operatingSystem: "Web",
                offers: {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "USD",
                },
              }),
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}