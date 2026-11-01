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
  metadataBase: new URL("https://tint-kin.vercel.app"),
  title: {
    template: "%s | TintKin",
    default: "TintKin — Your Daily Skin Coach",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-icon.png",
  },
  description: "A skin coach that adapts to you: a plan built for your skin, guided daily sessions, a routine that backs off when your skin reacts, and progress you can trust. Start free.",
  openGraph: {
    title: "TintKin — Your Daily Skin Coach",
    description: "A skin coach that adapts to you: a plan built for your skin, guided daily sessions, a routine that backs off when your skin reacts, and progress you can trust. Start free.",
    url: "https://tint-kin.vercel.app",
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
    title: "TintKin — Your Daily Skin Coach",
    description: "A skin coach that adapts to you: a plan built for your skin, guided daily sessions, a routine that backs off when your skin reacts, and progress you can trust. Start free.",
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
      "url": "https://tint-kin.vercel.app",
      "logo": "https://tint-kin.vercel.app/favicon.png",
      "description": "A daily skin coach: an adaptive plan, guided sessions, product checks and progress tracking."
    },
    {
      "@type": "WebSite",
      "name": "TintKin",
      "url": "https://tint-kin.vercel.app"
    },
    {
      "@type": "WebApplication",
      "name": "TintKin",
      "url": "https://tint-kin.vercel.app",
      "description": "A daily skin coach that adapts to your skin: guided sessions, reaction-aware routines, plan-aware product checks and measured progress.",
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
          "price": "8",
          "priceCurrency": "USD"
        },
        {
          "@type": "Offer",
          "name": "Pro Plan",
          "price": "15",
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
