"use client";

import { useState } from "react";
import { runWhatIfSim } from "@/app/lib/actions";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";

const PRESETS = [
  { id: "retinol", label: "Retinol @ 25 vs Retinol @ 35" },
];

export default function WhatIfPage() {
  const [selected, setSelected] = useState("retinol");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRun = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    const res = await runWhatIfSim(selected);
    setLoading(false);

    if (res.success) setResult(res);
    else setError(res.error);
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 68px)',
      background: 'radial-gradient(ellipse at 80% 10%, rgba(224,84,84,0.14) 0%, transparent 50%), radial-gradient(ellipse at 20% 90%, rgba(121,44,162,0.2) 0%, transparent 50%), var(--tk-bg)',
      padding: '48px 24px 64px',
    }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '40px', animation: 'fadeInUp 0.5s ease both' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '52px', height: '52px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #E05454, #C13383)',
            fontSize: '24px', marginBottom: '20px',
            boxShadow: '0 8px 28px rgba(224,84,84,0.4)',
          }}>🧪</div>
          <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--tk-text-faint)', marginBottom: '8px' }}>
            Simulation Lab
          </p>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-1.5px', margin: '0 0 12px' }}>
            What-If <span className="tk-gradient-text">Simulator</span>
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--tk-text-muted)', margin: 0 }}>
            See how small choices change your skin decades later.
          </p>
        </div>

        {/* Controls */}
        <div className="tk-glass" style={{
          borderRadius: '20px', padding: '24px',
          marginBottom: '28px',
          animation: 'fadeInUp 0.5s 0.1s ease both',
          display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center',
        }}>
          <div style={{ flex: '1 1 200px', position: 'relative' }}>
            <label style={{
              display: 'block', fontSize: '11px', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '2px',
              color: 'var(--tk-text-faint)', marginBottom: '8px',
            }}>
              Scenario
            </label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              id="whatif-scenario-select"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--tk-text-primary)',
                fontSize: '14px', fontWeight: 500,
                fontFamily: 'var(--font-outfit, inherit)',
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                WebkitAppearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23rgba(240,234,250,0.4)' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
                paddingRight: '36px',
              }}
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id} style={{ background: '#120e24' }}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRun}
            disabled={loading}
            id="whatif-run-btn"
            className="tk-btn-primary"
            style={{
              padding: '12px 28px',
              borderRadius: '12px',
              fontSize: '15px', fontWeight: 600,
              fontFamily: 'var(--font-outfit, inherit)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 6px 24px rgba(193,51,131,0.35)',
              alignSelf: 'flex-end',
              display: 'flex', alignItems: 'center', gap: '8px',
              minWidth: '180px', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {loading ? (
              <>
                <SpinnerIcon />
                Running…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Run Simulation
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '14px 18px', borderRadius: '12px',
            background: 'rgba(224,84,84,0.1)',
            border: '1px solid rgba(224,84,84,0.3)',
            color: 'var(--tk-coral)', fontSize: '14px', marginBottom: '20px',
            animation: 'fadeIn 0.3s ease both',
          }}>
            ❌ {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ animation: 'fadeIn 0.3s ease both' }}>
            <div className="tk-glass" style={{ borderRadius: '20px', padding: '28px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div className="tk-skeleton" style={{ height: '18px', width: '30%', borderRadius: '8px' }} />
                <div className="tk-skeleton" style={{ height: '18px', width: '30%', borderRadius: '8px' }} />
              </div>
              <div className="tk-skeleton" style={{ height: '320px', borderRadius: '14px' }} />
            </div>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'bounceIn 0.5s ease both' }}>

            {/* Compare Slider */}
            <div className="tk-glass" style={{ borderRadius: '20px', overflow: 'hidden' }}>
              {/* Labels */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '16px 20px 12px',
              }}>
                <span style={{
                  padding: '4px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 700,
                  background: 'rgba(52,211,153,0.15)', color: '#34d399',
                  border: '1px solid rgba(52,211,153,0.3)',
                }}>← {result.scenarioA.label}</span>
                <span style={{
                  padding: '4px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 700,
                  background: 'rgba(224,84,84,0.15)', color: 'var(--tk-coral)',
                  border: '1px solid rgba(224,84,84,0.3)',
                }}>{result.scenarioB.label} →</span>
              </div>
              <ReactCompareSlider
                itemOne={<ReactCompareSliderImage src={result.scenarioA.imageUrl} alt={result.scenarioA.label} />}
                itemTwo={<ReactCompareSliderImage src={result.scenarioB.imageUrl} alt={result.scenarioB.label} />}
                style={{ display: 'block' }}
              />
              <p style={{
                textAlign: 'center', fontSize: '12px', fontStyle: 'italic',
                color: 'var(--tk-text-faint)', padding: '12px 20px 16px',
              }}>
                Drag slider to compare both faces at age {result.targetAge}
              </p>
            </div>

            {/* Delta Table */}
            <div className="tk-glass" style={{ borderRadius: '20px', overflow: 'hidden' }}>
              <div style={{
                padding: '18px 22px',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                background: 'linear-gradient(90deg, rgba(224,84,84,0.08), rgba(68,49,153,0.08))',
              }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--tk-text-primary)' }}>
                  Difference: {result.scenarioA.label} vs {result.scenarioB.label}
                </h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Metric', result.scenarioA.label, result.scenarioB.label, 'Delta'].map((h, i) => (
                        <th key={h} style={{
                          padding: '12px 16px',
                          textAlign: i === 0 ? 'left' : 'center',
                          fontSize: '11px', fontWeight: 600,
                          textTransform: 'uppercase', letterSpacing: '1.5px',
                          color: 'var(--tk-text-faint)',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Skin Age row */}
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--tk-text-primary)' }}>Skin Age @ 50</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--tk-text-muted)' }}>{result.scenarioA.finalSkinAge}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--tk-text-muted)' }}>{result.scenarioB.finalSkinAge}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: '100px',
                          fontSize: '12px', fontWeight: 700,
                          background: 'rgba(52,211,153,0.15)', color: '#34d399',
                          border: '1px solid rgba(52,211,153,0.3)',
                        }}>
                          -{result.deltas.skinAge} yrs 🎯
                        </span>
                      </td>
                    </tr>
                    {/* Score rows */}
                    {Object.entries(result.scenarioA.projectedScores).map(([k], i) => (
                      <tr key={k} style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                      }}>
                        <td style={{ padding: '13px 16px', textTransform: 'capitalize', color: 'var(--tk-text-muted)', fontWeight: 500 }}>{k}</td>
                        <td style={{ padding: '13px 16px', textAlign: 'center', color: 'var(--tk-text-muted)' }}>{result.scenarioA.projectedScores[k]}</td>
                        <td style={{ padding: '13px 16px', textAlign: 'center', color: 'var(--tk-text-muted)' }}>{result.scenarioB.projectedScores[k]}</td>
                        <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: '100px',
                            fontSize: '12px', fontWeight: 700,
                            background: result.deltas[k] > 0 ? 'rgba(52,211,153,0.15)' : 'rgba(224,84,84,0.15)',
                            color: result.deltas[k] > 0 ? '#34d399' : 'var(--tk-coral)',
                            border: `1px solid ${result.deltas[k] > 0 ? 'rgba(52,211,153,0.3)' : 'rgba(224,84,84,0.3)'}`,
                          }}>
                            {result.deltas[k] > 0 ? '+' : ''}{result.deltas[k]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5"
      style={{ animation: 'spinRing 0.8s linear infinite' }}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}