import { AuthProvider } from "./context/AuthContext";
import { PwaProvider } from "./context/PwaContext";
import { Outfit, Playfair_Display } from "next/font/google";
import { headers, cookies } from "next/headers";
import { ToastProvider } from "./components/ToastProvider";
import AppShell from "./components/AppShell";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const viewport = {
  themeColor: "#FDFBF7",
  // Pinch-to-zoom off, per explicit request — makes the installed PWA feel
  // like a native app instead of a zoomable web page. iOS Safari's
  // auto-zoom-on-input-focus is handled separately (globals.css forces
  // 16px+ on form fields), so this isn't relied on for that.
  userScalable: false,
  maximumScale: 1,
};

export const metadata = {
  metadataBase: new URL("https://tintkin.com"),
  title: {
    template: "%s | TintKin",
    default: "TintKin — AI Skin Analysis & Wellness Journal",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-icon.png",
  },
  description: "Understand your skin's true potential. Upload a selfie and get instant AI-powered skin analysis, what-if simulations, and personalized insights.",
  openGraph: {
    title: "TintKin — AI Skin Analysis & Wellness Journal",
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
    title: "TintKin — AI Skin Analysis & Wellness Journal",
    description: "Understand your skin's true potential. Upload a selfie and get instant AI-powered skin analysis.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const rootStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "name": "TintKin",
      "url": "https://tintkin.com",
      "logo": "https://tintkin.com/favicon.png",
      "description": "AI-powered longitudinal skin wellness tracking and simulation platform."
    },
    {
      "@type": "WebSite",
      "name": "TintKin",
      "url": "https://tintkin.com"
    },
    {
      "@type": "WebApplication",
      "name": "TintKin",
      "url": "https://tintkin.com",
      "description": "AI-powered skincare wellness journal and analysis.",
      "applicationCategory": "HealthAndFitnessApplication",
      "operatingSystem": "Web",
      "offers": [
        {
          "@type": "Offer",
          "name": "Free Tier",
          "price": "0",
          "priceCurrency": "USD"
        },
        {
          "@type": "Offer",
          "name": "Standard Plan",
          "price": "12",
          "priceCurrency": "USD"
        },
        {
          "@type": "Offer",
          "name": "Pro Plan",
          "price": "24",
          "priceCurrency": "USD"
        }
      ]
    }
  ]
};

// Same cookie names proxy.js checks. Only used to pick the right shell before
// the client session resolves; real auth is still enforced server-side.
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export default async function RootLayout({ children }) {
  const nonce = (await headers()).get("x-nonce") || undefined;
  const cookieStore = await cookies();
  const saved = cookieStore.get("tk-theme")?.value;
  const theme = ["rose", "terracotta"].includes(saved) ? saved : "sage";
  const initialAuthed = cookieStore
    .getAll()
    .some((c) => c.value && SESSION_COOKIES.some((n) => c.name === n || c.name.startsWith(`${n}.`)));
  return (
    <html lang="en" dir="ltr" data-theme={theme} className={`${outfit.variable} ${playfair.variable} h-full`}>
      <body className="tk-body min-h-screen min-h-[100dvh] flex flex-col">
        <PwaProvider>
        <AuthProvider>
          <ToastProvider>
            <AppShell initialAuthed={initialAuthed}>{children}</AppShell>

            <script
              type="application/ld+json"
              nonce={nonce}
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(rootStructuredData),
              }}
            />
          </ToastProvider>
        </AuthProvider>
        </PwaProvider>
      </body>
    </html>
  );
}
