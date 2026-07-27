"use client";

import { useState } from "react";
import { getAgedProjection } from "@/app/lib/actions";
import Image from "next/image";

const YEARS = [5, 10, 20];

export default function TimeMachinePage() {
  const [selectedYears, setSelectedYears] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleProject = async (years) => {
    setSelectedYears(years);
    setLoading(true);
    setError("");
    setResult(null);

    const res = await getAgedProjection(years);
    setLoading(false);

    if (res.success) setResult(res);
    else setError(res.error);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-base tk-mesh-bg py-12 px-6 lg:px-12 relative overflow-hidden">
      
      <div className="max-w-4xl mx-auto relative z-10">

        {/* Header */}
        <div className="mb-12 tk-anim-1 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-lavender text-primary shadow-[0_8px_32px_rgba(230,230,250,0.8)] mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-medium text-primary mb-4">
            A Gentle <span className="italic text-sage">Look Forward</span>
          </h1>
          <p className="text-muted text-lg max-w-lg mx-auto">
            See how consistent care today blossoms in the years to come.
          </p>
        </div>

        {/* Year Selector */}
        <div className="flex flex-wrap gap-4 mb-12 tk-anim-2 justify-center max-w-2xl mx-auto">
          {YEARS.map((y) => (
            <YearPill
              key={y}
              years={y}
              active={selectedYears === y}
              loading={loading}
              onClick={handleProject}
            />
          ))}
        </div>

        {/* Loading shimmer */}
        {loading && (
          <div className="tk-anim-3 tk-glass p-8 lg:p-12">
            <div className="h-6 bg-black/5 rounded-full mb-8 w-1/2 animate-pulse" />
            <div className="grid md:grid-cols-2 gap-8">
              <div className="aspect-[3/4] bg-black/5 rounded-3xl animate-pulse" />
              <div className="flex flex-col gap-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-10 bg-black/5 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="tk-anim-3 bg-red-50 text-red-700 px-6 py-4 rounded-2xl border border-red-100 text-sm font-medium text-center">
            {error}
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="tk-glass p-8 lg:p-12 tk-anim-4">
            <div className="grid md:grid-cols-2 gap-10 items-start">
              
              {/* Aged Image */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">
                  Age {result.targetAge} Projection
                </p>
                <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-[0_16px_40px_rgba(44,62,80,0.15)] ring-1 ring-white/60">
                  <Image
                    src={result.agedImageUrl}
                    alt={`Aged ${selectedYears} years`}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-primary/60 to-transparent" />
                  <div className="absolute bottom-6 left-6 text-white font-medium text-sm">
                    +{selectedYears} years of nurturing
                  </div>
                </div>
              </div>

              {/* Projection Stats */}
              <div>
                <div className={`p-6 rounded-3xl mb-8 border ${result.skinAgeDelta < 0 ? 'bg-sage/10 border-sage/20' : 'bg-orange-50 border-orange-100'}`}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">Projected Skin Age</p>
                  <p className={`text-6xl font-display font-medium mb-4 ${result.skinAgeDelta < 0 ? 'text-sage' : 'text-orange-400'}`}>
                    {result.targetAge + result.skinAgeDelta}
                  </p>
                  <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium ${result.skinAgeDelta < 0 ? 'bg-sage/20 text-sage' : 'bg-orange-100 text-orange-600'}`}>
                    {result.skinAgeDelta < 0
                      ? `Glowing: ${Math.abs(result.skinAgeDelta)} years younger`
                      : `Needs care: ${result.skinAgeDelta} years older`}
                  </div>
                </div>

                <h3 className="text-xs font-semibold text-muted uppercase tracking-widest mb-6">Predicted Elements</h3>
                
                <div className="flex flex-col gap-5">
                  {Object.entries(result.projectedScores).map(([k, v]) => (
                    <div key={k}>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium capitalize text-muted">{k}</span>
                        <span className="text-sm font-semibold text-primary">{v}</span>
                      </div>
                      <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-1000 ease-out bg-lavender"
                          style={{ width: `${v}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-faint mt-10">
                  Source: {result.meta.velocitySource === "user" ? "Your personalized journal history" : "General dermatological patterns"}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function YearPill({ years, active, loading, onClick }) {
  return (
    <button
      onClick={() => onClick(years)}
      disabled={loading}
      className={`
        flex-1 min-w-[120px] py-4 px-6 rounded-full font-medium text-sm transition-all duration-300
        ${active 
          ? 'bg-primary text-white shadow-[0_8px_24px_rgba(44,62,80,0.25)] -translate-y-1' 
          : 'bg-white/40 text-muted border border-white/40 hover:bg-white/60 hover:text-primary hover:-translate-y-0.5'
        }
        ${loading ? 'opacity-50 cursor-not-allowed transform-none' : ''}
      `}
    >
      +{years} Years
    </button>
  );
}