"use client";

import Link from "next/link";

export function HeroSection() {
  return (
    <div className="tk-hero-wrapper">
      {/* Animated Orbs */}
      <div aria-hidden="true" className="tk-orbs-container">
        <div className="tk-orb tk-orb-1" />
        <div className="tk-orb tk-orb-2" />
        <div className="tk-orb tk-orb-3" />
      </div>

      {/* Hero Content */}
      <main className="tk-hero-main">

        {/* Badge */}
        <div className="tk-hero-badge tk-anim-1">
          <span className="tk-live-dot" />
          Powered by advanced AI skin analysis
        </div>

        {/* H1 */}
        <h1 className="tk-hero-h1 tk-anim-2">
          Your Skin,{" "}
          <span className="tk-gradient-text">Understood.</span>
        </h1>

        {/* Sub-copy */}
        <p className="tk-hero-sub tk-anim-3">
          Upload a selfie and our AI instantly analyses your skin health, predicts how it will age, and simulates treatments — so you can glow smarter, not harder.
        </p>

        {/* CTAs */}
        <div className="tk-hero-ctas tk-anim-4">
          <Link href="/capture" id="hero-cta-scan" className="tk-btn-hero-primary">
            Start Your Free Scan
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
          <Link href="/dashboard" id="hero-cta-dashboard" className="tk-btn-hero-ghost">
            View Dashboard
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="tk-features-grid">
          <FeatureCard
            title="Instant Analysis"
            description="Detailed metrics on wrinkles, firmness, spots, and radiance in seconds."
            icon="⚡"
            iconClass="tk-card-coral-icon"
            delay="0.1s"
          />
          <FeatureCard
            title="Time Machine"
            description="See exactly how your skin will look 5, 10, or 20 years from now."
            icon="⏰"
            iconClass="tk-card-rose-icon"
            delay="0.2s"
          />
          <FeatureCard
            title="What-If Scenarios"
            description="Compare lifestyle changes like adding Retinol or wearing SPF every day."
            icon="🧪"
            iconClass="tk-card-violet-icon"
            delay="0.3s"
          />
        </div>

        {/* How It Works */}
        <HowItWorks />

      </main>
    </div>
  );
}

function FeatureCard({ title, description, icon, iconClass, delay }) {
  return (
    <div
      className="tk-glass tk-feature-card"
      style={{ animationDelay: delay }}
    >
      <div className={`tk-feature-icon ${iconClass}`}>{icon}</div>
      <h3 className="tk-feature-title">{title}</h3>
      <p className="tk-feature-desc">{description}</p>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Upload a Selfie", desc: "A clear, filter-free front-facing photo is all it takes." },
    { n: "02", title: "AI Analyses", desc: "Our model scores 6 key skin metrics within seconds." },
    { n: "03", title: "Get Your Report", desc: "Explore your dashboard, future projections, and what-if scenarios." },
  ];
  return (
    <div className="tk-hiw-section">
      <p className="tk-hiw-label">How It Works</p>
      <div className="tk-hiw-grid">
        {steps.map((s) => (
          <div key={s.n} className="tk-glass tk-hiw-card">
            <span className="tk-gradient-text tk-hiw-num">{s.n}</span>
            <p className="tk-hiw-title">{s.title}</p>
            <p className="tk-hiw-desc">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
