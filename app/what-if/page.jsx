"use client";

import { useState } from "react";
import { runWhatIfSim } from "@/app/lib/actions";
import { ReactCompareSlider, ReactCompareSliderImage, ReactCompareSliderHandle } from "react-compare-slider";

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
    <div className="min-h-[calc(100vh-80px)] bg-base tk-mesh-bg py-12 px-6 lg:px-12 relative overflow-hidden">
      <div className="max-w-4xl mx-auto relative z-10">

        {/* Header */}
        <div className="mb-12 tk-anim-1 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FFDAB9]/40 text-orange-400 shadow-[0_8px_32px_rgba(255,218,185,0.8)] mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31"></path><path d="M14 9.3V1.99"></path><path d="M8.5 2h7"></path><path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path><path d="M5.52 16h12.96"></path></svg>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-medium text-primary mb-4">
            The <span className="italic text-orange-400/80">What-If</span> Sandbox
          </h1>
          <p className="text-muted text-lg max-w-lg mx-auto">
            Gently explore how small choices today shape your skin decades later.
          </p>
        </div>

        {/* Controls */}
        <div className="tk-glass p-6 md:p-8 rounded-3xl mb-12 tk-anim-2 flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-3">
              Explore Scenario
            </label>
            <div className="relative">
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full appearance-none bg-white/50 border border-white/40 text-primary py-3.5 pl-5 pr-12 rounded-2xl font-medium focus:outline-none focus:ring-2 focus:ring-sage/30 transition-all cursor-pointer"
              >
                {PRESETS.map((p) => (
                  <option key={p.id} value={p.id} className="text-primary bg-white">
                    {p.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={loading}
            className={`
              tk-pill-btn w-full md:w-auto min-w-[200px] flex items-center justify-center gap-2 py-3.5
              ${loading ? 'bg-primary/80 cursor-not-allowed' : 'tk-btn-primary shadow-[0_8px_24px_rgba(44,62,80,0.15)]'}
            `}
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                Processing...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                Visualize
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="tk-anim-3 bg-red-50 text-red-700 px-6 py-4 rounded-2xl border border-red-100 text-sm font-medium mb-8 text-center">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="tk-anim-3 tk-glass p-8 rounded-3xl mb-8">
            <div className="flex justify-between mb-6">
              <div className="h-6 w-32 bg-black/5 rounded-full animate-pulse" />
              <div className="h-6 w-32 bg-black/5 rounded-full animate-pulse" />
            </div>
            <div className="h-[400px] w-full bg-black/5 rounded-2xl animate-pulse" />
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="flex flex-col gap-8 tk-anim-4">

            {/* Compare Slider */}
            <div className="tk-glass rounded-3xl overflow-hidden shadow-[0_16px_40px_rgba(44,62,80,0.08)]">
              {/* Labels */}
              <div className="flex justify-between p-6 bg-white/40 border-b border-white/30">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold bg-sage/15 text-sage border border-sage/20">
                  ← {result.scenarioA.label}
                </span>
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-500 border border-orange-100">
                  {result.scenarioB.label} →
                </span>
              </div>
              
              <div className="relative">
                <ReactCompareSlider
                  handle={
                    <ReactCompareSliderHandle 
                      buttonStyle={{
                        backdropFilter: 'blur(4px)',
                        background: 'rgba(255, 255, 255, 0.8)',
                        border: '1px solid rgba(44,62,80,0.1)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        color: '#2C3E50',
                      }}
                      linesStyle={{ opacity: 0.5, color: '#2C3E50' }}
                    />
                  }
                  itemOne={<ReactCompareSliderImage src={result.scenarioA.imageUrl} alt={result.scenarioA.label} />}
                  itemTwo={<ReactCompareSliderImage src={result.scenarioB.imageUrl} alt={result.scenarioB.label} />}
                  className="w-full"
                />
              </div>
              
              <p className="text-center text-xs font-medium text-muted py-5 bg-white/20">
                Slide to compare outcomes at age {result.targetAge}
              </p>
            </div>

            {/* Delta Table */}
            <div className="tk-glass rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-white/30 bg-white/40">
                <h3 className="text-lg font-display font-medium text-primary m-0">
                  Impact Analysis
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/20 bg-white/10">
                      {['Metric', result.scenarioA.label, result.scenarioB.label, 'Impact'].map((h, i) => (
                        <th key={h} className={`px-6 py-4 text-xs font-semibold uppercase tracking-widest text-muted ${i > 0 ? 'text-center' : ''}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Skin Age row */}
                    <tr className="border-b border-white/10 hover:bg-white/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-primary text-sm">Skin Age @ 50</td>
                      <td className="px-6 py-4 text-center text-muted text-sm">{result.scenarioA.finalSkinAge}</td>
                      <td className="px-6 py-4 text-center text-muted text-sm">{result.scenarioB.finalSkinAge}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold bg-sage/15 text-sage border border-sage/20">
                          -{result.deltas.skinAge} yrs ✨
                        </span>
                      </td>
                    </tr>
                    {/* Score rows */}
                    {Object.entries(result.scenarioA.projectedScores).map(([k], i) => (
                      <tr key={k} className={`border-b border-white/10 hover:bg-white/30 transition-colors ${i % 2 === 0 ? '' : 'bg-white/5'}`}>
                        <td className="px-6 py-4 font-medium text-primary text-sm capitalize">{k}</td>
                        <td className="px-6 py-4 text-center text-muted text-sm">{result.scenarioA.projectedScores[k]}</td>
                        <td className="px-6 py-4 text-center text-muted text-sm">{result.scenarioB.projectedScores[k]}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center min-w-[3rem] px-3 py-1 rounded-full text-xs font-semibold border ${
                            result.deltas[k] > 0 
                              ? 'bg-sage/15 text-sage border-sage/20' 
                              : 'bg-orange-50 text-orange-500 border-orange-100'
                          }`}>
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