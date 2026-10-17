import { Suspense } from "react";
import { headers } from "next/headers";
import { Check } from "lucide-react";
import PricingClient from "./PricingClient";

export const metadata = {
    title: "Pricing & Plans",
    description: "Affordable, transparent AI skin wellness tracking. Start free with 2 scans/mo, or upgrade for daily tracking and what-if simulations.",
    alternates: {
        canonical: "/pricing",
    },
    openGraph: {
        title: "Pricing & Plans | TintKin",
        description: "Affordable, transparent AI skin wellness tracking. Start free with 2 scans/mo, or upgrade for daily tracking and what-if simulations.",
        url: "https://tintkin.com/pricing",
    },
};

const pricingStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": "https://tintkin.com"
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Pricing",
                    "item": "https://tintkin.com/pricing"
                }
            ]
        },
        {
            "@type": "Product",
            "name": "TintKin Skin Wellness Journal",
            "description": "AI-powered longitudinal skin wellness tracking and simulation platform.",
            "offers": [
                {
                    "@type": "Offer",
                    "name": "Free Tier",
                    "price": "0",
                    "priceCurrency": "USD",
                    "description": "2 AI scans and 1 simulation per month"
                },
                {
                    "@type": "Offer",
                    "name": "Standard Plan",
                    "price": "12",
                    "priceCurrency": "USD",
                    "description": "15 AI scans and 3 simulations per month"
                },
                {
                    "@type": "Offer",
                    "name": "Pro Plan",
                    "price": "24",
                    "priceCurrency": "USD",
                    "description": "Daily AI scans, 4 simulations per month, and custom product uploads"
                }
            ]
        },
        {
            "@type": "FAQPage",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": "Can I test TintKin for free?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Yes! The Free plan provides 2 scans and 1 AI simulation every month with no credit card required."
                    }
                },
                {
                    "@type": "Question",
                    "name": "What is the Strict Every Other Day frequency in Standard?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "It enforces a 48-hour gap between your 15 scans, perfectly pacing your skin tracking across a full 30-day month."
                    }
                },
                {
                    "@type": "Question",
                    "name": "Can I switch or cancel my plan at any time?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Yes, you can change your tier or pacing anytime directly from your account settings."
                    }
                }
            ]
        }
    ]
};

export default async function PricingPage() {
    const nonce = (await headers()).get("x-nonce") || undefined;
    const demo = process.env.ENABLE_DEMO_TIER_SWITCHING === "true";
    const benefits = [
        "Track acne, pigmentation, redness & texture",
        "Personalized skincare routines",
        "AI what-if simulations",
        "Visible progress over time",
    ];
    return (
        <div className="tk-container py-6 sm:py-10">
            <script
                type="application/ld+json"
                nonce={nonce}
                dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingStructuredData) }}
            />
            <div className="tk-card p-6 sm:p-8 mb-6 sm:mb-8 tk-anim-1 md:flex md:items-center md:justify-between md:gap-10">
                <div>
                    <p className="tk-eyebrow mb-2">Unlock Your Potential</p>
                    <h1 className="text-[1.75rem] sm:text-4xl font-semibold text-primary leading-tight">
                        Healthier skin.<br />A more confident you.
                    </h1>
                    <p className="text-muted text-sm sm:text-base max-w-xl mt-3">
                        {demo
                            ? "Select the plan that fits your skin goals. Early access preview — all tiers are unlocked for testing!"
                            : "Select the plan that fits your skin goals. Standard and Pro are paid plans and will take you to checkout."}
                    </p>
                </div>
                <ul className="mt-5 md:mt-0 space-y-2.5 shrink-0">
                    {benefits.map((b) => (
                        <li key={b} className="flex items-center gap-2.5 text-sm text-primary">
                            <span className="tk-icon-circle w-6 h-6 shrink-0"><Check className="w-3.5 h-3.5 text-accent" /></span>
                            {b}
                        </li>
                    ))}
                </ul>
            </div>

            <Suspense fallback={null}>
                <PricingClient demoMode={demo} />
            </Suspense>
        </div>
    );
}
