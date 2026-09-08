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

export default function PricingPage() {
    return (
        <div className="min-h-[calc(100vh-80px)] bg-base tk-mesh-bg py-8 sm:py-12 px-4 sm:px-6 lg:px-12 relative overflow-hidden">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingStructuredData) }}
            />
            <div className="max-w-6xl mx-auto relative z-10">
                <div className="text-center mb-8 sm:mb-16 tk-anim-1">
                    <p className="text-xs font-semibold tracking-[0.2em] uppercase text-sage mb-2">
                        Unlock Your Potential
                    </p>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-medium text-primary mb-4">
                        Choose your <span className="italic text-sage">Journey</span>
                    </h1>
                    <p className="text-muted text-sm sm:text-base max-w-xl mx-auto px-2">
                        Select the plan that fits your skin goals. Early access preview — all tiers are unlocked for testing!
                    </p>
                </div>

                <PricingClient />
            </div>
        </div>
    );
}
