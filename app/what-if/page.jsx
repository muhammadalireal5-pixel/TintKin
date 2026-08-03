"use client";

import { useState, useEffect } from "react";
import { runWhatIfSim, getLatestData, getSavedSimulations, deleteSavedSimulation } from "@/app/lib/actions";
import { ReactCompareSlider, ReactCompareSliderImage, ReactCompareSliderHandle } from "react-compare-slider";
import Link from "next/link";
import ProductImage from "@/app/dashboard/ProductImage";

const DEFAULT_PRODUCTS = [
  {
    type: "Cleanser",
    formula: "Gentle Hydrating Cleanser",
    description: "Mild formula that cleanses while strengthening the natural skin moisture barrier.",
  },
  {
    type: "Serum",
    formula: "Vitamin C + Niacinamide Serum",
    description: "Targeted treatment that brightens skin tone, fades dark spots, and smooths fine lines.",
  },
  {
    type: "Moisturizer",
    formula: "Ceramide Barrier Cream",
    description: "Deeply nourishing cream that locks in hydration and improves firmness over time.",
  },
];

export default function WhatIfPage() {
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [hasSelfie, setHasSelfie] = useState(true);
  const [simMode, setSimMode] = useState("single"); // "single" | "compare" | "full" | "custom"

  // Selections
  const [selectedSingle, setSelectedSingle] = useState(0); // index in products
  const [prodAIndex, setProdAIndex] = useState(0);
  const [prodBIndex, setProdBIndex] = useState(1);
  const [customListA, setCustomListA] = useState([0, 1, 2]); // indices for custom Scenario A
  const [customListB, setCustomListB] = useState([]); // indices for custom Scenario B

  // Simulation output
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // History
  const [history, setHistory] = useState([]);

  useEffect(() => {
    getLatestData()
      .then((d) => {
        if (!d.latestSelfie) {
          setHasSelfie(false);
        } else if (d.latestSelfie.recommendedProducts && d.latestSelfie.recommendedProducts.length > 0) {
          setProducts(d.latestSelfie.recommendedProducts);
        }
      })
      .catch(() => {});

    getSavedSimulations().then((res) => {
      if (res.success && res.simulations) {
        setHistory(res.simulations);
      }
    });
  }, []);

  const handleRunSimulation = async () => {
    if (!hasSelfie) {
      setError("Please capture or upload a selfie first to run the AI image simulation.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    let interventionsA = [];
    let interventionsB = [];
    let labelA = "Scenario A";
    let labelB = "Scenario B";

    if (simMode === "single") {
      const targetProd = products[selectedSingle] || products[0];
      interventionsA = [targetProd.type];
      interventionsB = [];
      labelA = `With ${targetProd.formula || targetProd.type}`;
      labelB = "Without Routine";
    } else if (simMode === "compare") {
      const pA = products[prodAIndex] || products[0];
      const pB = products[prodBIndex] || products[1];
      interventionsA = [pA.type];
      interventionsB = [pB.type];
      labelA = `Using ${pA.type} (${pA.formula || pA.type})`;
      labelB = `Using ${pB.type} (${pB.formula || pB.type})`;
    } else if (simMode === "full") {
      interventionsA = products.map((p) => p.type);
      interventionsB = [];
      labelA = "All 3 Recommended Products";
      labelB = "Without Routine";
    } else if (simMode === "custom") {
      interventionsA = customListA.map((i) => products[i]?.type).filter(Boolean);
      interventionsB = customListB.map((i) => products[i]?.type).filter(Boolean);
      labelA = customListA.length > 0 
        ? `Scenario A (${customListA.map(i => products[i]?.type).join(", ")})` 
        : "No Products";
      labelB = customListB.length > 0 
        ? `Scenario B (${customListB.map(i => products[i]?.type).join(", ")})` 
        : "Without Routine";
    }

    try {
      const res = await runWhatIfSim(interventionsA, interventionsB, labelA, labelB);
      setLoading(false);

      if (res.success) {
        setResult(res);
        setHistory((prev) => [res, ...prev]);
      } else {
        setError(res.error || "Simulation failed. Please try again.");
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || "An unexpected error occurred.");
    }
  };

  const handleDeleteSim = async (e, simId) => {
    e.stopPropagation(); // prevent clicking the card
    const confirmed = window.confirm("Are you sure you want to delete this simulation? This cannot be undone.");
    if (!confirmed) return;

    // Optimistic UI update
    setHistory((prev) => prev.filter((s) => (s.id || s._id) !== simId));

    // Call server action
    await deleteSavedSimulation(simId);
  };

  const toggleCustomItem = (index, targetScenario) => {
    if (targetScenario === "A") {
      setCustomListA((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      );
    } else {
      setCustomListB((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      );
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-base tk-mesh-bg py-12 px-4 sm:px-6 lg:px-12 relative overflow-hidden">
      <div className="max-w-5xl mx-auto relative z-10">

        {/* Header */}
        <div className="mb-10 text-center tk-anim-1">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FFDAB9]/40 text-orange-400 shadow-[0_8px_32px_rgba(255,218,185,0.8)] mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2v7.31"></path>
              <path d="M14 9.3V1.99"></path>
              <path d="M8.5 2h7"></path>
              <path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path>
              <path d="M5.52 16h12.96"></path>
            </svg>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-medium text-primary mb-3">
            Product <span className="italic text-orange-400/90">What-If</span> Simulator
          </h1>
          <p className="text-muted text-base sm:text-lg max-w-xl mx-auto">
            Choose from your personalized recommended products to visualize future skin improvements.
          </p>
        </div>

        {/* No Selfie Alert */}
        {!hasSelfie && (
          <div className="tk-anim-2 tk-glass p-8 rounded-3xl mb-10 text-center border border-amber-200/50 bg-amber-50/40">
            <p className="text-primary font-medium text-lg mb-1">Selfie Required for AI Visuals</p>
            <p className="text-muted text-sm mb-5 max-w-md mx-auto">
              Take a quick photo to unlock AI skin aging simulation for your recommended products.
            </p>
            <Link href="/capture" className="tk-pill-btn tk-btn-primary inline-flex items-center gap-2">
              Capture Selfie First
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </Link>
          </div>
        )}

        {/* Section 1: Recommended Products Display */}
        <div className="mb-10 tk-anim-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-display font-medium text-primary">Your Recommended Products</h2>
              <p className="text-xs text-muted">Tailored formulations derived from your skin analysis</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-sage/15 text-sage rounded-full border border-sage/20">
              3 Active Formulas
            </span>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {products.map((prod, idx) => {
              const isSelectedSingle = selectedSingle === idx;
              const isProdA = prodAIndex === idx;
              const isProdB = prodBIndex === idx;
              const inCustomA = customListA.includes(idx);
              const inCustomB = customListB.includes(idx);

              return (
                <div
                  key={idx}
                  className={`
                    tk-glass rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group border
                    ${simMode === "single" && isSelectedSingle ? "ring-2 ring-sage shadow-lg border-sage/40 bg-white/70 scale-[1.02]" : "border-white/40 hover:border-white/80 hover:shadow-md"}
                    ${simMode === "compare" && (isProdA || isProdB) ? "ring-2 ring-orange-300 border-orange-300/40 bg-white/70 scale-[1.02]" : ""}
                  `}
                >
                  {/* Badge & Type */}
                  <div className="flex justify-between items-start mb-3 z-10">
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full uppercase tracking-wider">
                      {prod.type || "Product"}
                    </span>
                    {simMode === "compare" && (
                      <div className="flex gap-1">
                        {isProdA && (
                          <span className="px-2 py-0.5 bg-sage text-white text-[10px] font-bold rounded-md shadow-sm">
                            Option A
                          </span>
                        )}
                        {isProdB && (
                          <span className="px-2 py-0.5 bg-orange-400 text-white text-[10px] font-bold rounded-md shadow-sm">
                            Option B
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Visual Image Container */}
                  <div className="relative w-full h-44 rounded-2xl overflow-hidden mb-4 bg-white/50 border border-white/60 shadow-inner group-hover:scale-[1.01] transition-transform">
                    <ProductImage
                      type={prod.type}
                      alt={prod.formula || prod.type}
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-60"></div>
                  </div>

                  {/* Details */}
                  <div className="mb-4">
                    <h3 className="font-display text-base font-semibold text-primary mb-1 line-clamp-1">
                      {prod.formula || `${prod.type} Treatment`}
                    </h3>
                    <p className="text-xs text-muted leading-relaxed line-clamp-3">
                      {prod.description || "Designed to improve overall skin health and texture."}
                    </p>
                  </div>

                  {/* Mode-Specific Actions */}
                  <div className="pt-3 border-t border-black/5 flex flex-col gap-2">
                    {simMode === "single" && (
                      <button
                        onClick={() => setSelectedSingle(idx)}
                        className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isSelectedSingle
                            ? "bg-sage text-white shadow-sm"
                            : "bg-white/60 text-primary hover:bg-white hover:shadow-xs"
                        }`}
                      >
                        {isSelectedSingle ? "Selected for Test ✓" : "Select Product"}
                      </button>
                    )}

                    {simMode === "compare" && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setProdAIndex(idx)}
                          className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                            isProdA
                              ? "bg-sage text-white shadow-xs"
                              : "bg-white/60 text-primary hover:bg-white"
                          }`}
                        >
                          {isProdA ? "Set for A ✓" : "Set Product A"}
                        </button>
                        <button
                          onClick={() => setProdBIndex(idx)}
                          className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                            isProdB
                              ? "bg-orange-400 text-white shadow-xs"
                              : "bg-white/60 text-primary hover:bg-white"
                          }`}
                        >
                          {isProdB ? "Set for B ✓" : "Set Product B"}
                        </button>
                      </div>
                    )}

                    {simMode === "custom" && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => toggleCustomItem(idx, "A")}
                          className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                            inCustomA
                              ? "bg-sage text-white shadow-xs"
                              : "bg-white/50 text-muted hover:bg-white"
                          }`}
                        >
                          {inCustomA ? "In Scenario A ✓" : "+ Add to A"}
                        </button>
                        <button
                          onClick={() => toggleCustomItem(idx, "B")}
                          className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                            inCustomB
                              ? "bg-orange-400 text-white shadow-xs"
                              : "bg-white/50 text-muted hover:bg-white"
                          }`}
                        >
                          {inCustomB ? "In Scenario B ✓" : "+ Add to B"}
                        </button>
                      </div>
                    )}

                    {simMode === "full" && (
                      <div className="py-2 text-center text-xs font-medium text-sage bg-sage/10 rounded-xl">
                        Included in Full Routine ✓
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Mode Selector Controls */}
        <div className="tk-glass p-6 sm:p-8 rounded-3xl mb-10 tk-anim-3">
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-4">
            Simulation Comparison Mode
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <button
              onClick={() => setSimMode("single")}
              className={`py-3 px-4 rounded-2xl text-xs font-semibold transition-all flex flex-col items-center gap-1.5 border ${
                simMode === "single"
                  ? "bg-primary text-white border-primary shadow-md"
                  : "bg-white/50 text-primary border-white/60 hover:bg-white/80"
              }`}
            >
              <span className="text-sm">🧪</span>
              <span>1 Product vs None</span>
            </button>

            <button
              onClick={() => setSimMode("compare")}
              className={`py-3 px-4 rounded-2xl text-xs font-semibold transition-all flex flex-col items-center gap-1.5 border ${
                simMode === "compare"
                  ? "bg-primary text-white border-primary shadow-md"
                  : "bg-white/50 text-primary border-white/60 hover:bg-white/80"
              }`}
            >
              <span className="text-sm">⚖️</span>
              <span>Product A vs Product B</span>
            </button>

            <button
              onClick={() => setSimMode("full")}
              className={`py-3 px-4 rounded-2xl text-xs font-semibold transition-all flex flex-col items-center gap-1.5 border ${
                simMode === "full"
                  ? "bg-primary text-white border-primary shadow-md"
                  : "bg-white/50 text-primary border-white/60 hover:bg-white/80"
              }`}
            >
              <span className="text-sm">🌟</span>
              <span>Full Routine (All 3)</span>
            </button>

            <button
              onClick={() => setSimMode("custom")}
              className={`py-3 px-4 rounded-2xl text-xs font-semibold transition-all flex flex-col items-center gap-1.5 border ${
                simMode === "custom"
                  ? "bg-primary text-white border-primary shadow-md"
                  : "bg-white/50 text-primary border-white/60 hover:bg-white/80"
              }`}
            >
              <span className="text-sm">⚙️</span>
              <span>Custom Selection</span>
            </button>
          </div>

          {/* Mode Summary Banner */}
          <div className="bg-white/40 border border-white/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-muted">
              {simMode === "single" && (
                <p>Simulating improvement with <span className="font-semibold text-primary">{products[selectedSingle]?.formula || products[selectedSingle]?.type}</span> versus no treatment.</p>
              )}
              {simMode === "compare" && (
                <p>Comparing <span className="font-semibold text-sage">{products[prodAIndex]?.type}</span> vs <span className="font-semibold text-orange-400">{products[prodBIndex]?.type}</span> impact side-by-side.</p>
              )}
              {simMode === "full" && (
                <p>Simulating the maximum combined transformation of using all 3 recommended products together.</p>
              )}
              {simMode === "custom" && (
                <p>Comparing {customListA.length} selected product(s) in Scenario A against {customListB.length} product(s) in Scenario B.</p>
              )}
            </div>

            <button
              onClick={handleRunSimulation}
              disabled={loading}
              className={`
                tk-pill-btn w-full sm:w-auto min-w-[210px] flex items-center justify-center gap-2 py-3 px-6 text-sm font-semibold
                ${loading ? "bg-primary/70 text-white cursor-not-allowed" : "tk-btn-primary shadow-[0_8px_24px_rgba(44,62,80,0.18)]"}
              `}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                  Running AI Simulation...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  Generate Simulation
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="tk-anim-3 bg-red-50/90 border border-red-200 text-red-700 px-6 py-4 rounded-2xl text-sm font-medium mb-8 text-center shadow-xs">
            {error}
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="tk-anim-3 tk-glass p-8 rounded-3xl mb-8 space-y-6">
            <div className="flex justify-between items-center">
              <div className="h-6 w-40 bg-black/10 rounded-full animate-pulse" />
              <div className="h-6 w-40 bg-black/10 rounded-full animate-pulse" />
            </div>
            <div className="h-[420px] w-full bg-black/5 rounded-2xl animate-pulse flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="w-10 h-10 border-4 border-sage border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-semibold text-muted">Processing facial feature enhancements...</p>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Interactive Results */}
        {result && !loading && (
          <div className="flex flex-col gap-8 tk-anim-4">

            {/* Compare Slider Card */}
            <div className="tk-glass rounded-3xl overflow-hidden shadow-[0_16px_40px_rgba(44,62,80,0.08)] border border-white/50">
              {/* Scenario Header Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/50 border-b border-white/30 gap-3">
                <div className="inline-flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sage"></span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sage/15 text-sage border border-sage/20">
                    ← {result.scenarioA.label}
                  </span>
                </div>

                <div className="inline-flex items-center gap-2 justify-end">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-200/60">
                    {result.scenarioB.label} →
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
                </div>
              </div>
              
              {/* Image Slider */}
              <div className="relative min-h-[380px] sm:min-h-[460px] bg-black/5" style={{ aspectRatio: '4/3' }}>
                <ReactCompareSlider
                  handle={
                    <ReactCompareSliderHandle 
                      buttonStyle={{
                        backdropFilter: 'blur(6px)',
                        background: 'rgba(255, 255, 255, 0.9)',
                        border: '1px solid rgba(44,62,80,0.15)',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                        color: '#2C3E50',
                      }}
                      linesStyle={{ opacity: 0.6, color: '#2C3E50' }}
                    />
                  }
                  itemOne={<ReactCompareSliderImage src={result.scenarioA.imageUrl} alt={result.scenarioA.label} className="w-full h-full object-cover" />}
                  itemTwo={<ReactCompareSliderImage src={result.scenarioB.imageUrl} alt={result.scenarioB.label} className="w-full h-full object-cover" />}
                  className="w-full h-full min-h-[380px] sm:min-h-[460px]"
                />
              </div>
              
              <div className="flex items-center justify-center gap-2 py-4 bg-white/30 text-xs font-medium text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 8 8 12 12 16"></polyline><line x1="16" y1="12" x2="8" y2="12"></line></svg>
                Drag slider to visually compare outcomes at age {result.targetAge}
              </div>
            </div>

            {/* Impact Analysis Table */}
            <div className="tk-glass rounded-3xl overflow-hidden border border-white/50">
              <div className="p-6 border-b border-white/30 bg-white/40 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-display font-medium text-primary m-0">
                    Quantitative Impact Analysis
                  </h3>
                  <p className="text-xs text-muted">Projected skin score improvements over 1 year</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-sage/20 text-sage border border-sage/30">
                  Skin Age Delta: -{result.deltas.skinAge || result.scenarioA.skinAgeDelta} yrs ✨
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/20 bg-white/20">
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-muted">Metric</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-muted text-center">{result.scenarioA.label}</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-muted text-center">{result.scenarioB.label}</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-muted text-center">Net Improvement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Skin Age Row */}
                    <tr className="border-b border-white/10 hover:bg-white/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-primary text-sm">Projected Skin Age</td>
                      <td className="px-6 py-4 text-center text-muted text-sm font-semibold">{result.scenarioA.finalSkinAge} yrs</td>
                      <td className="px-6 py-4 text-center text-muted text-sm font-semibold">{result.scenarioB.finalSkinAge} yrs</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold bg-sage/15 text-sage border border-sage/20">
                          -{result.deltas.skinAge || 1} yrs younger
                        </span>
                      </td>
                    </tr>

                    {/* Scores Rows */}
                    {Object.entries(result.scenarioA.projectedScores).map(([metricKey], idx) => {
                      const scoreA = result.scenarioA.projectedScores[metricKey];
                      const scoreB = result.scenarioB.projectedScores[metricKey];
                      const deltaVal = result.deltas[metricKey];

                      return (
                        <tr key={metricKey} className={`border-b border-white/10 hover:bg-white/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-white/5'}`}>
                          <td className="px-6 py-4 font-medium text-primary text-sm capitalize">{metricKey}</td>
                          <td className="px-6 py-4 text-center text-muted text-sm">{scoreA} / 100</td>
                          <td className="px-6 py-4 text-center text-muted text-sm">{scoreB} / 100</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center justify-center min-w-[3.5rem] px-3 py-1 rounded-full text-xs font-semibold border ${
                              deltaVal > 0 
                                ? 'bg-sage/15 text-sage border-sage/20' 
                                : deltaVal < 0
                                ? 'bg-orange-50 text-orange-500 border-orange-100'
                                : 'bg-gray-100 text-gray-500 border-gray-200'
                            }`}>
                              {deltaVal > 0 ? `+${deltaVal}` : deltaVal}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Section 4: History / Saved Simulations */}
        {history.length > 0 && (
          <div className="mt-16 tk-anim-5">
            <h3 className="text-xl font-display font-medium text-primary mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
              Saved Simulations
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map((sim, idx) => {
                const simId = sim.id || sim._id;
                return (
                <div
                  key={simId || idx}
                  onClick={() => {
                    setResult(sim);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="tk-glass rounded-2xl p-4 text-left border border-white/40 hover:border-sage/40 hover:shadow-lg transition-all group relative cursor-pointer"
                >
                  <button
                    onClick={(e) => handleDeleteSim(e, simId)}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100 z-10"
                    title="Delete simulation"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                  <p className="text-sm font-semibold text-primary mb-3 line-clamp-2 leading-snug pr-8">
                    <span className="text-sage">{sim.scenarioA?.label || sim.name?.split(" vs ")[0] || "Scenario A"}</span>
                    <br/><span className="text-[10px] uppercase font-bold text-muted/70 tracking-wider">vs</span><br/>
                    <span className="text-orange-500">{sim.scenarioB?.label || sim.name?.split(" vs ")[1] || "Scenario B"}</span>
                  </p>
                  <div className="flex gap-1 h-24 rounded-lg overflow-hidden bg-black/5 border border-white/50">
                    {sim.scenarioA?.imageUrl ? <img src={sim.scenarioA.imageUrl} className="w-1/2 h-full object-cover" alt="" /> : <div className="w-1/2 h-full bg-black/5"></div>}
                    {sim.scenarioB?.imageUrl ? <img src={sim.scenarioB.imageUrl} className="w-1/2 h-full object-cover" alt="" /> : <div className="w-1/2 h-full bg-black/5"></div>}
                  </div>
                  <div className="mt-4 text-xs font-semibold text-sage flex justify-between items-center opacity-80 group-hover:opacity-100 transition-opacity">
                    <span className="text-muted/60">{sim.createdAt ? new Date(sim.createdAt).toLocaleDateString() : 'Just now'}</span>
                    <span>View Details →</span>
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}