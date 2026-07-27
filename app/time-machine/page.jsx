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
    <div style={{
      minHeight: 'calc(100vh - 68px)',
      background: 'radial-gradient(ellipse at 10% 30%, rgba(121,44,162,0.2) 0%, transparent 50%), radial-gradient(ellipse at 90% 70%, rgba(68,49,153,0.18) 0%, transparent 50%), var(--tk-bg)',
      padding: '48px 24px 64px',
    }}>
      <div style={{ maxWidth: '780px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '40px', animation: 'fadeInUp 0.5s ease both' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '52px', height: '52px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #792CA2, #443199)',
            fontSize: '24px', marginBottom: '20px',
            boxShadow: '0 8px 28px rgba(121,44,162,0.45)',
          }}>⏰</div>
          <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--tk-text-faint)', marginBottom: '8px' }}>
            Future Vision
          </p>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-1.5px', margin: '0 0 12px' }}>
            Skin <span className="tk-gradient-text">Time Machine</span>
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--tk-text-muted)', margin: 0 }}>
            See where your skin is headed on your current path.
          </p>
        </div>

        {/* Year Selector */}
        <div style={{
          display: 'flex', gap: '14px', marginBottom: '36px',
          animation: 'fadeInUp 0.5s 0.1s ease both',
          flexWrap: 'wrap',
        }}>
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
          <div style={{ animation: 'fadeIn 0.3s ease both' }}>
            <div className="tk-glass" style={{ borderRadius: '20px', padding: '40px', marginBottom: '16px' }}>
              <div className="tk-skeleton" style={{ height: '20px', borderRadius: '10px', marginBottom: '16px', width: '60%' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="tk-skeleton" style={{ height: '280px', borderRadius: '16px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="tk-skeleton" style={{ height: '40px', borderRadius: '10px' }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '16px 20px', borderRadius: '14px',
            background: 'rgba(224,84,84,0.1)',
            border: '1px solid rgba(224,84,84,0.3)',
            color: 'var(--tk-coral)', fontSize: '14px', fontWeight: 500,
            animation: 'fadeIn 0.3s ease both',
          }}>
            ❌ {error}
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="tk-glass" style={{
            borderRadius: '24px', padding: '28px',
            animation: 'bounceIn 0.5s ease both',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '28px',
              alignItems: 'start',
            }}>
              {/* Aged Image */}
              <div>
                <p style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--tk-text-faint)', marginBottom: '12px' }}>
                  Your face at age {result.targetAge}
                </p>
                <div style={{
                  position: 'relative',
                  aspectRatio: '3/4',
                  borderRadius: '18px',
                  overflow: 'hidden',
                  boxShadow: '0 0 0 2px rgba(193,51,131,0.5), 0 16px 48px rgba(0,0,0,0.5)',
                }}>
                  <Image
                    src={result.agedImageUrl}
                    alt={`Aged ${selectedYears} years`}
                    fill
                    className="object-cover"
                  />
                  {/* Gradient overlay at bottom */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: '80px',
                    background: 'linear-gradient(transparent, rgba(13,10,26,0.8))',
                  }} />
                  <div style={{
                    position: 'absolute', bottom: '12px', left: '14px',
                    fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)',
                  }}>
                    +{selectedYears} years from now
                  </div>
                </div>
              </div>

              {/* Projection Stats */}
              <div>
                {/* Projected age */}
                <div style={{
                  padding: '20px',
                  borderRadius: '16px',
                  background: result.skinAgeDelta < 0 ? 'rgba(52,211,153,0.08)' : 'rgba(224,84,84,0.08)',
                  border: `1px solid ${result.skinAgeDelta < 0 ? 'rgba(52,211,153,0.25)' : 'rgba(224,84,84,0.25)'}`,
                  marginBottom: '20px',
                }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--tk-text-faint)', marginBottom: '6px' }}>
                    Projected Skin Age
                  </p>
                  <p style={{
                    fontSize: '44px', fontWeight: 800, lineHeight: 1, margin: '0 0 8px',
                    color: result.skinAgeDelta < 0 ? '#34d399' : 'var(--tk-coral)',
                  }}>
                    {result.targetAge + result.skinAgeDelta}
                  </p>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '4px 12px', borderRadius: '100px',
                    fontSize: '12px', fontWeight: 600,
                    background: result.skinAgeDelta < 0 ? 'rgba(52,211,153,0.15)' : 'rgba(224,84,84,0.15)',
                    color: result.skinAgeDelta < 0 ? '#34d399' : 'var(--tk-coral)',
                  }}>
                    {result.skinAgeDelta < 0
                      ? `🎉 ${Math.abs(result.skinAgeDelta)}yrs YOUNGER than chronological`
                      : `⚠️ ${result.skinAgeDelta}yrs OLDER than chronological`}
                  </span>
                </div>

                {/* Projected Scores */}
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--tk-text-primary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1.5px', fontSize: '11px' }}>
                  Projected Scores
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Object.entries(result.projectedScores).map(([k, v]) => (
                    <div key={k}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, textTransform: 'capitalize', color: 'var(--tk-text-muted)' }}>{k}</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tk-text-primary)' }}>{v}</span>
                      </div>
                      <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{
                          height: '100%', width: `${v}%`, borderRadius: '2px',
                          background: 'linear-gradient(90deg, #E05454, #C13383, #792CA2)',
                          transition: 'width 1s ease',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>

                <p style={{ fontSize: '11px', color: 'var(--tk-text-faint)', marginTop: '18px' }}>
                  Source: {result.meta.velocitySource === "user" ? "Your scan history" : "Dermatology research baseline"}
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
      id={`time-machine-${years}yr`}
      style={{
        flex: '1 1 100px',
        padding: '18px 24px',
        borderRadius: '18px',
        border: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
        background: active ? 'var(--tk-gradient)' : 'rgba(255,255,255,0.04)',
        color: active ? 'white' : 'var(--tk-text-muted)',
        fontSize: '15px', fontWeight: 700,
        fontFamily: 'var(--font-outfit, inherit)',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.5 : 1,
        transition: 'all 0.25s ease',
        boxShadow: active ? '0 8px 28px rgba(193,51,131,0.4)' : 'none',
        transform: active ? 'translateY(-2px)' : 'none',
        letterSpacing: '-0.3px',
      }}
      onMouseEnter={e => {
        if (!active && !loading) {
          e.currentTarget.style.borderColor = 'rgba(193,51,131,0.4)';
          e.currentTarget.style.color = 'var(--tk-text-primary)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={e => {
        if (!active && !loading) {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
          e.currentTarget.style.color = 'var(--tk-text-muted)';
          e.currentTarget.style.transform = 'none';
        }
      }}
    >
      +{years} Years
    </button>
  );
}