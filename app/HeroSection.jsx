"use client";

import Link from "next/link";

export function HeroSection() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] bg-base selection:bg-lavender selection:text-primary">
      
      {/* ── Top Hero Split ─────────────────────────────────── */}
      <section className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        
        {/* Left Side: 60% Typography & Action */}
        <div className="w-full lg:w-[60%] flex flex-col justify-center px-6 lg:px-20 py-12 lg:py-20 z-10 text-center lg:text-left">
          
          <div className="tk-anim-1 inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-sage/10 border border-sage/20 w-fit mb-6 lg:mb-8 mx-auto lg:mx-0">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sage opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sage"></span>
            </span>
            <span className="text-sm font-medium text-sage">A gentle approach to skin health</span>
          </div>

          <h1 className="tk-anim-2 text-4xl sm:text-5xl lg:text-7xl font-display font-medium leading-[1.1] tracking-tight text-primary mb-4 lg:mb-6 max-w-3xl mx-auto lg:mx-0">
            A daily journal for your <span className="italic text-sage/90">skin’s</span> journey.
          </h1>

          <p className="tk-anim-3 text-base sm:text-lg lg:text-xl text-muted leading-relaxed max-w-xl mb-8 lg:mb-12 mx-auto lg:mx-0">
            Move away from harsh clinical metrics. Discover a mindful, AI-supported companion that helps you understand, nurture, and celebrate your skin every day.
          </p>

          <div className="tk-anim-4 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
            <Link href="/onboarding" className="tk-pill-btn tk-btn-primary flex items-center justify-center gap-2 w-full sm:w-auto shadow-[0_8px_24px_rgba(44,62,80,0.12)]">
              Begin journey
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </Link>
            <Link href="/dashboard" className="tk-pill-btn tk-btn-ghost flex items-center justify-center w-full sm:w-auto">
              View your journal
            </Link>
          </div>
        </div>

        {/* Right Side: 40% Visual & App Mockup */}
        <div className="w-full lg:w-[40%] relative min-h-[280px] sm:min-h-[400px] lg:min-h-full tk-mesh-bg flex items-center justify-center p-4 sm:p-6 lg:p-12">
          
          {/* Decorative Floating Mockup */}
          <div className="relative z-10 w-full max-w-[280px] sm:max-w-[340px] tk-glass tk-anim-5 flex flex-col p-4 sm:p-6 shadow-2xl" style={{ animation: 'fadeInUp 1s 0.8s ease both, orbFloat 12s 2s ease-in-out infinite' }}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-xs font-semibold text-muted tracking-widest uppercase mb-1">Today</p>
                <h3 className="font-display text-xl text-primary font-medium">Morning Glow</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-lavender flex items-center justify-center text-primary shadow-sm">
                ✦
              </div>
            </div>

            <div className="space-y-4">
              <div className="h-24 rounded-2xl bg-gradient-to-br from-white/60 to-white/20 border border-white/40 flex items-center p-4">
                <div className="w-2 h-full rounded-full bg-sage/60 mr-4"></div>
                <div>
                  <p className="text-sm font-medium text-primary">Hydration</p>
                  <p className="text-xs text-muted">Looking dewy and balanced.</p>
                </div>
              </div>
              
              <div className="h-16 rounded-2xl bg-white/40 border border-white/40 flex items-center p-4">
                <div className="w-2 h-full rounded-full bg-[#FFDAB9] mr-4"></div>
                <div>
                  <p className="text-sm font-medium text-primary">Redness</p>
                  <p className="text-xs text-muted">A little sensitive today.</p>
                </div>
              </div>
            </div>
            
            <button className="mt-6 w-full py-3 rounded-full bg-white/50 hover:bg-white/70 text-primary text-sm font-medium transition-colors border border-white/40 shadow-sm">
              Read full insight
            </button>
          </div>

        </div>
      </section>

      {/* ── Below the Fold: Features ──────────────────────────────── */}
      <section className="px-6 lg:px-20 py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-display font-medium text-primary mb-4">A gentle perspective on care</h2>
            <p className="text-muted leading-relaxed">Embrace a routine that listens to your skin's unique needs, backed by thoughtful intelligence.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <FeatureCard 
              title="Daily Check-ins" 
              desc="Snap a quick, filter-free photo to log your skin's mood and hydration levels instantly."
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>}
              colorClass="bg-sage/10 text-sage"
            />
            <FeatureCard 
              title="What-If Scenarios" 
              desc="Curious about a new serum? Gently explore how different choices could feel."
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31"></path><path d="M14 9.3V1.99"></path><path d="M8.5 2h7"></path><path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path><path d="M5.52 16h12.96"></path></svg>}
              colorClass="bg-[#FFDAB9]/40 text-[#E05454]"
            />
          </div>
        </div>
      </section>

      {/* ── Sticky Mobile CTA ────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-base/80 backdrop-blur-md border-t border-black/5 z-40 tk-anim-1 pb-safe">
        <Link href="/onboarding" className="tk-pill-btn tk-btn-primary flex items-center justify-center gap-2 w-full shadow-lg">
          Begin journey
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </Link>
      </div>

    </div>
  );
}

function FeatureCard({ title, desc, icon, colorClass }) {
  return (
    <div className="flex flex-col p-8 rounded-3xl bg-base border border-solid hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${colorClass}`}>
        {icon}
      </div>
      <h3 className="font-display text-xl font-medium text-primary mb-3">{title}</h3>
      <p className="text-muted leading-relaxed text-sm">{desc}</p>
    </div>
  );
}
