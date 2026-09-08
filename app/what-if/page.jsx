"use client";

import { useState, useEffect, useRef } from "react";
import { runWhatIfSim, getLatestData, getSavedSimulations, deleteSavedSimulation, getUsageQuotas, analyzeProductImage, uploadSelfieServerAction, updateSimulationPrivacy } from "@/app/lib/actions";
import { ReactCompareSlider, ReactCompareSliderImage, ReactCompareSliderHandle } from "react-compare-slider";
import Link from "next/link";
import ProductImage from "@/app/dashboard/ProductImage";
import ConfirmModal from "@/app/components/ConfirmModal";
import ProductScanModal from "./ProductScanModal";
import { Check, FlaskConical, Scale, Star, Settings, Calendar, Sparkles, ArrowLeft, ArrowRight } from "lucide-react";
import { ComponentErrorFallback } from "@/app/components/ComponentErrorFallback";

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

function formatSimDate(dateString) {
  if (!dateString) return "Just now";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "Recently";
    return d.toISOString().split("T")[0];
  } catch {
    return "Recently";
  }
}

export default function WhatIfPage() {
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [hasSelfie, setHasSelfie] = useState(true);
  const [simMode, setSimMode] = useState("single");

  const [selectedSingle, setSelectedSingle] = useState(0);
  const [prodAIndex, setProdAIndex] = useState(0);
  const [prodBIndex, setProdBIndex] = useState(1);
  const [customListA, setCustomListA] = useState([0, 1, 2]);
  const [customListB, setCustomListB] = useState([]);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [customImageUrl, setCustomImageUrl] = useState(null);
  const [customImageUploading, setCustomImageUploading] = useState(false);
  
  const [keepPhoto, setKeepPhoto] = useState(false);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [simConfirmed, setSimConfirmed] = useState(false);

  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [productScanError, setProductScanError] = useState("");
  const [isAnalyzingProduct, setIsAnalyzingProduct] = useState(false);

  const handleProductFileSelected = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      setIsAnalyzingProduct(true);
      setProductScanError("");

      try {
        const res = await analyzeProductImage(base64);
        if (res.success && res.product) {
          setProducts((prev) => [...prev, { ...res.product, isCustom: true }]);
          setScanModalOpen(false);
        } else {
          setProductScanError(res.error || "Failed to analyze product.");
        }
      } catch (err) {
        setProductScanError("Error analyzing product.");
      } finally {
        setIsAnalyzingProduct(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCustomPhotoSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomImageUploading(true);
    setError("");
    
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await uploadSelfieServerAction(form);
      if (res.success && res.url) {
        setCustomImageUrl(res.url);
      } else {
        setError(res.error || "Failed to upload photo.");
      }
    } catch (err) {
      setError("Error uploading photo.");
    } finally {
      setCustomImageUploading(false);
    }
  };

  const [history, setHistory] = useState([]);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [simToDelete, setSimToDelete] = useState(null);
  const [quotas, setQuotas] = useState(null);
  const [userTier, setUserTier] = useState('free');

  useEffect(() => {
    getLatestData()
      .then((d) => {
        setUserTier(d.user?.tier || 'free');
        if (!d.latestSelfie || !d.latestSelfie.imageUrl || !d.latestSelfie.scores || typeof d.latestSelfie.scores.wrinkles !== "number") {
          setHasSelfie(false);
        }
        
        if (d.latestSelfie && d.latestSelfie.recommendedProducts && d.latestSelfie.recommendedProducts.length > 0) {
          setProducts(d.latestSelfie.recommendedProducts);
        }
      })
      .catch(() => {
        setError("Could not load your skin profile data. Please check your connection.");
      });

    getSavedSimulations().then((res) => {
      if (res.success && res.simulations) {
        setHistory(res.simulations);
      }
    });

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    getUsageQuotas(tz).then((data) => setQuotas(data)).catch(() => {});
  }, []);

  useEffect(() => {
  if (result) {
    const resultsElement = document.getElementById("simulation-results");
    
    if (resultsElement) {
      resultsElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  }, [result]);

  const handleRunSimulation = async () => {
    if (!hasSelfie && !customImageUrl) {
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
      interventionsA = [targetProd];
      interventionsB = [];
      labelA = `With ${targetProd.formula || targetProd.type}`;
      labelB = "Without Routine";
    } else if (simMode === "compare") {
      const pA = products[prodAIndex] || products[0];
      const pB = products[prodBIndex] || products[1];
      interventionsA = [pA];
      interventionsB = [pB];
      labelA = `Using ${pA.type} (${pA.formula || pA.type})`;
      labelB = `Using ${pB.type} (${pB.formula || pB.type})`;
    } else if (simMode === "full") {
      interventionsA = products;
      interventionsB = [];
      labelA = "All Recommended Products";
      labelB = "Without Routine";
    } else if (simMode === "custom") {
      interventionsA = customListA.map((i) => products[i]).filter(Boolean);
      interventionsB = customListB.map((i) => products[i]).filter(Boolean);
      labelA = customListA.length > 0 
        ? `Scenario A (${customListA.map(i => products[i]?.type).join(", ")})` 
        : "No Products";
      labelB = customListB.length > 0 
        ? `Scenario B (${customListB.map(i => products[i]?.type).join(", ")})` 
        : "Without Routine";
    }

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await runWhatIfSim(interventionsA, interventionsB, labelA, labelB, tz, customImageUrl);
      setLoading(false);

      if (res.success) {
        setResult(res);
        setSimConfirmed(false); // Reset confirmation state
        // Temporarily add to history. If they discard, we'll remove it.
        setHistory((prev) => [res, ...prev]);
      } else {
        setError(res.message || res.error || "Simulation failed. Please try again.");
      }
    } catch (err) {
      setLoading(false);
      setError("Something went wrong, please try again later.");
    }
  };

  const handleDeleteSim = (e, simId) => {
    e.stopPropagation();
    setSimToDelete(simId);
    setDeleteModalOpen(true);
  };

  const confirmDeleteSim = async () => {
    if (!simToDelete) return;
    const id = simToDelete;
    
    setDeleteModalOpen(false);
    setSimToDelete(null);

    setHistory((prev) => prev.filter((s) => (s.id || s._id) !== id));

    await deleteSavedSimulation(id);
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

  const handleConfirmSimulation = async () => {
    if (!result || !result.id) return;
    setIsSavingPrivacy(true);
    const res = await updateSimulationPrivacy(result.id, keepPhoto);
    setIsSavingPrivacy(false);
    
    if (res.success) {
      setSimConfirmed(true);
      // Update history with the final sim (which might have null imageUrls)
      setHistory((prev) => prev.map(s => (s.id || s._id) === result.id ? res.sim : s));
    }
  };

  const handleDiscardSimulation = async () => {
    if (!result || !result.id) return;
    setIsSavingPrivacy(true);
    await deleteSavedSimulation(result.id);
    setHistory((prev) => prev.filter(s => (s.id || s._id) !== result.id));
    setResult(null);
    setSimConfirmed(false);
    setIsSavingPrivacy(false);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-base tk-mesh-bg py-12 px-4 sm:px-6 lg:px-12 relative overflow-hidden">
      <div className="max-w-5xl mx-auto relative z-10">

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

        {(!hasSelfie || customImageUrl) ? (
          <div className="tk-anim-2 tk-glass p-8 rounded-3xl mb-10 text-center border border-primary/10">
            <p className="text-primary font-medium text-lg mb-1">
              {customImageUrl ? "Photo Ready for Simulation" : "Photo Required for AI Visuals"}
            </p>
            <p className="text-muted text-sm mb-5 max-w-md mx-auto">
              {customImageUrl ? "You've successfully added a photo for this simulation." : "Take or upload a photo to visualize skin improvements."}
            </p>
            
            {!customImageUrl && (
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <label className="tk-pill-btn tk-btn-primary inline-flex items-center gap-2 cursor-pointer opacity-90 hover:opacity-100">
                  {customImageUploading ? "Uploading..." : "Take / Upload Photo"}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleCustomPhotoSelected} 
                    disabled={customImageUploading}
                  />
                  {!customImageUploading && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>}
                </label>
              </div>
            )}
            
            {customImageUrl && (
              <button 
                onClick={() => setCustomImageUrl(null)} 
                className="text-xs text-muted hover:text-primary transition-colors underline underline-offset-2"
              >
                Use a different photo
              </button>
            )}
          </div>
        ) : (
          <div className="tk-anim-2 tk-glass p-6 rounded-3xl mb-10 flex flex-col sm:flex-row items-center justify-between gap-4 border border-primary/10">
            <div className="text-center sm:text-left">
              <p className="text-primary font-medium text-sm">Using your latest saved journal photo</p>
              <p className="text-xs text-muted">Simulations will run on your baseline selfie.</p>
            </div>
            <label className="tk-pill-btn bg-white border border-black/10 text-primary text-xs py-2 inline-flex items-center gap-2 cursor-pointer hover:bg-black/5 transition-colors">
              {customImageUploading ? "Uploading..." : "Upload New Photo"}
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleCustomPhotoSelected} 
                disabled={customImageUploading}
              />
            </label>
          </div>
        )}

        <div className="mb-10 tk-anim-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-display font-medium text-primary">Your Recommended Products</h2>
              <p className="text-xs text-muted">Tailored formulations derived from your skin analysis</p>
            </div>
            <div className="flex gap-3 items-center">
              <span className="text-xs font-semibold px-3 py-1 bg-sage/15 text-sage rounded-full border border-sage/20">
                {products.length} Active Formulas
              </span>
              <button
                onClick={() => {
                  setProductScanError("");
                  setScanModalOpen(true);
                }}
                disabled={isAnalyzingProduct || userTier !== 'premium'}
                title={userTier !== 'premium' ? "Custom product scanning is a Pro feature" : "Scan a custom product"}
                className="text-xs font-semibold px-4 py-1.5 bg-primary text-white rounded-full flex items-center gap-1.5 hover:bg-primary/90 transition disabled:opacity-50 cursor-pointer shadow-sm relative group"
              >
                {isAnalyzingProduct ? <span className="animate-spin text-[10px]">⏳</span> : <Sparkles className="w-3 h-3" />}
                {isAnalyzingProduct ? "Analyzing..." : "Scan My Product"}
                
                {/* Tooltip for non-premium */}
                {userTier !== 'premium' && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Pro feature
                  </div>
                )}
              </button>
            </div>
          </div>

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
                  <div className="flex justify-between items-start mb-3 z-10">
                    <div className="flex gap-2 items-center">
                      <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full uppercase tracking-wider">
                        {prod.type || "Product"}
                      </span>
                      {prod.isCustom && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                          Custom
                        </span>
                      )}
                    </div>
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

                  <div className="relative w-full h-44 rounded-2xl overflow-hidden mb-4 bg-white/50 border border-white/60 shadow-inner group-hover:scale-[1.01] transition-transform">
                    <ProductImage
                      type={prod.type}
                      alt={prod.formula || prod.type}
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-60"></div>
                  </div>

                  <div className="mb-4">
                    <h3 className="font-display text-base font-semibold text-primary mb-1 line-clamp-1">
                      {prod.formula || `${prod.type} Treatment`}
                    </h3>
                    <p className="text-xs text-muted leading-relaxed line-clamp-3">
                      {prod.description || "Designed to improve overall skin health and texture."}
                    </p>
                  </div>

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
                        {isSelectedSingle ? <span className="flex items-center justify-center gap-1">Selected for Test <Check size={14}/></span> : "Select Product"}
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
                          {isProdA ? <span className="flex items-center justify-center gap-1">Set for A <Check size={14}/></span> : "Set Product A"}
                        </button>
                        <button
                          onClick={() => setProdBIndex(idx)}
                          className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                            isProdB
                              ? "bg-orange-400 text-white shadow-xs"
                              : "bg-white/60 text-primary hover:bg-white"
                          }`}
                        >
                          {isProdB ? <span className="flex items-center justify-center gap-1">Set for B <Check size={14}/></span> : "Set Product B"}
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
                          {inCustomA ? <span className="flex items-center justify-center gap-1">In Scenario A <Check size={14}/></span> : "+ Add to A"}
                        </button>
                        <button
                          onClick={() => toggleCustomItem(idx, "B")}
                          className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                            inCustomB
                              ? "bg-orange-400 text-white shadow-xs"
                              : "bg-white/50 text-muted hover:bg-white"
                          }`}
                        >
                          {inCustomB ? <span className="flex items-center justify-center gap-1">In Scenario B <Check size={14}/></span> : "+ Add to B"}
                        </button>
                      </div>
                    )}

                    {simMode === "full" && (
                      <div className="py-2 text-center text-xs font-medium text-sage bg-sage/10 rounded-xl flex items-center justify-center gap-1">
                        Included in Full Routine <Check size={14}/>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
              <FlaskConical size={18} className="text-current" />
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
              <Scale size={18} className="text-current" />
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
              <Star size={18} className="text-current" />
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
              <Settings size={18} className="text-current" />
              <span>Custom Selection</span>
            </button>
          </div>

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

            <div className="flex flex-col gap-2 items-center sm:items-end w-full sm:w-auto">
              <button
                onClick={handleRunSimulation}
                disabled={loading || (quotas && quotas.simulations.used >= quotas.simulations.limit)}
                className={`
                  tk-pill-btn w-full sm:w-auto min-w-[210px] flex items-center justify-center gap-2 py-3 px-6 text-sm font-semibold
                  ${(loading || (quotas && quotas.simulations.used >= quotas.simulations.limit)) ? "bg-primary/70 text-white cursor-not-allowed" : "tk-btn-primary shadow-[0_8px_24px_rgba(44,62,80,0.18)]"}
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
              {quotas && (
                <div className={`text-xs font-bold px-3 py-1.5 rounded-full ${quotas.simulations.used >= quotas.simulations.limit ? 'bg-red-50/80 text-red-900 border border-red-200 shadow-sm' : 'bg-primary/5 text-primary border border-primary/10'}`}>
                  {quotas.simulations.used >= quotas.simulations.limit ? 'Monthly simulation limit reached.' : `${quotas.simulations.used}/${quotas.simulations.limit} simulations used`}
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="tk-anim-3 bg-red-50/90 border border-red-200 text-red-700 px-6 py-4 rounded-2xl text-sm font-medium mb-8 text-center shadow-xs">
            {error}
          </div>
        )}

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

        {result && !loading && (
          <div id="simulation-results" className="flex flex-col gap-8 tk-anim-4 scroll-mt-24">
            <ComponentErrorFallback title="Simulation Results">

            <div className="tk-glass rounded-3xl overflow-hidden shadow-[0_16px_40px_rgba(44,62,80,0.08)] border border-white/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/50 border-b border-white/30 gap-3">
                <div className="inline-flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sage"></span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sage/15 text-sage border border-sage/20 flex items-center">
                    <ArrowLeft size={14} className="mr-1" /> {result.scenarioA.label}
                  </span>
                </div>

                <div className="inline-flex items-center gap-2 justify-end">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100/50 text-orange-800 border border-orange-300 flex items-center shadow-sm">
                    {result.scenarioB.label} <ArrowRight size={14} className="ml-1" />
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
                </div>
              </div>
              
              <div className="relative min-h-[380px] sm:min-h-[460px] bg-black/5" style={{ aspectRatio: '4/3' }}>
                {result.scenarioA.imageUrl && result.scenarioB.imageUrl ? (
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
                ) : (
                  <div className="w-full h-full min-h-[380px] sm:min-h-[460px] flex flex-col items-center justify-center bg-[#FDFBF7] p-8 text-center border-y border-black/5">
                    <div className="w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center mb-4 text-sage border border-sage/20">
                      <Sparkles size={24} />
                    </div>
                    <p className="text-primary font-medium text-lg mb-2">Photos Removed for Privacy</p>
                    <p className="text-muted text-sm max-w-md">
                      You chose not to save the photos for this simulation. 
                      You can still review the data-driven score projections below!
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-center gap-2 py-4 bg-white/30 text-xs font-medium text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 8 8 12 12 16"></polyline><line x1="16" y1="12" x2="8" y2="12"></line></svg>
                Drag slider to visually compare outcomes {result.targetAge ? `at age ${result.targetAge}` : "after 1 year"}
              </div>
            </div>

            <div className="tk-glass rounded-3xl overflow-hidden border border-white/50">
              <div className="bg-sage/10 border-b border-sage/20 p-4 flex items-center gap-3">
                <Calendar size={24} className="text-sage" />
                <div>
                  <h4 className="text-sm font-semibold text-primary">Projection: 1 Year of Consistent Use</h4>
                  <p className="text-xs text-muted">Results assume daily use of the selected product(s) for 12 months.</p>
                </div>
              </div>
              <div className="p-6 border-b border-white/30 bg-white/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-display font-medium text-primary m-0">
                    Quantitative Impact Analysis
                  </h3>
                </div>
                <span className="px-3 py-1 flex items-center gap-1 rounded-full text-xs font-bold bg-sage/20 text-sage border border-sage/30 self-start sm:self-auto">
                  Skin Age Difference: {
                    typeof result.deltas?.skinAge === "number"
                      ? result.deltas.skinAge > 0
                        ? `${result.deltas.skinAge} yrs younger`
                        : result.deltas.skinAge < 0
                          ? `${Math.abs(result.deltas.skinAge)} yrs older`
                          : "No difference"
                      : "N/A"
                  } <Sparkles size={14}/>
                </span>
              </div>
              
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/20 bg-white/20">
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-muted">Metric</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-muted text-center">{result.scenarioA.label}</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-muted text-center">{result.scenarioB.label}</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-muted text-center">Improvement</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/10 hover:bg-white/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-primary text-sm">Projected Skin Age</td>
                      <td className="px-6 py-4 text-center text-sage text-sm font-semibold">{result.scenarioA.finalSkinAge} yrs</td>
                      <td className="px-6 py-4 text-center text-muted text-sm font-semibold">{result.scenarioB.finalSkinAge} yrs</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold border ${
                          (result.deltas?.skinAge || 0) > 0 ? 'bg-sage/15 text-sage border-sage/20' : (result.deltas?.skinAge || 0) < 0 ? 'bg-red-50/80 text-red-800 border-red-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}>
                          {typeof result.deltas?.skinAge === "number"
                            ? result.deltas.skinAge > 0
                              ? `${result.deltas.skinAge} yrs younger`
                              : result.deltas.skinAge < 0
                                ? `${Math.abs(result.deltas.skinAge)} yrs older`
                                : "No difference"
                            : "—"}
                        </span>
                      </td>
                    </tr>
                    {Object.entries(result.scenarioA.projectedScores).map(([metricKey], idx) => {
                      const scoreA = result.scenarioA.projectedScores[metricKey];
                      const scoreB = result.scenarioB.projectedScores[metricKey];
                      const deltaVal = result.deltas[metricKey];
                      
                      const labels = { wrinkles: "Wrinkle Smoothness", firmness: "Skin Firmness", spots: "Spot Clarity", radiance: "Radiance & Glow" };
                      const humanLabel = labels[metricKey] || metricKey;

                      return (
                        <tr key={metricKey} className={`border-b border-white/10 hover:bg-white/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-white/5'}`}>
                          <td className="px-6 py-4 font-medium text-primary text-sm">{humanLabel}</td>
                          <td className="px-6 py-4 text-center text-sage font-medium text-sm">{scoreA} / 100</td>
                          <td className="px-6 py-4 text-center text-muted text-sm">{scoreB} / 100</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center justify-center min-w-[4rem] px-3 py-1 rounded-full text-xs font-semibold border ${
                              deltaVal > 0 ? 'bg-sage/15 text-sage border-sage/20' : deltaVal < 0 ? 'bg-red-50/80 text-red-800 border-red-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                            }`}>
                              {deltaVal > 0 ? `+${deltaVal} ↑` : deltaVal < 0 ? `${deltaVal} ↓` : deltaVal}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="sm:hidden flex flex-col p-4 gap-4">
                <div className="bg-white/50 border border-white/60 rounded-2xl p-4 shadow-sm">
                  <div className="text-sm font-semibold text-primary mb-3">Projected Skin Age</div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted line-clamp-1 flex-1 pr-2">{result.scenarioA.label}:</span>
                    <span className="text-sm font-semibold text-sage">{result.scenarioA.finalSkinAge} yrs</span>
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-muted line-clamp-1 flex-1 pr-2">{result.scenarioB.label}:</span>
                    <span className="text-sm font-semibold text-muted">{result.scenarioB.finalSkinAge} yrs</span>
                  </div>
                  <div className="pt-3 border-t border-black/5 flex justify-between items-center">
                    <span className="text-xs font-medium text-muted uppercase tracking-wider">Impact</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      (result.deltas?.skinAge || 0) > 0 ? 'text-sage bg-sage/15' : (result.deltas?.skinAge || 0) < 0 ? 'text-red-800 bg-red-50/80' : 'text-gray-500 bg-gray-100'
                    }`}>
                      {typeof result.deltas?.skinAge === "number"
                        ? result.deltas.skinAge > 0
                          ? `${result.deltas.skinAge} yrs younger`
                          : result.deltas.skinAge < 0
                            ? `${Math.abs(result.deltas.skinAge)} yrs older`
                            : "No difference"
                        : "—"}
                    </span>
                  </div>
                </div>

                {Object.entries(result.scenarioA.projectedScores).map(([metricKey]) => {
                  const scoreA = result.scenarioA.projectedScores[metricKey];
                  const scoreB = result.scenarioB.projectedScores[metricKey];
                  const deltaVal = result.deltas[metricKey];
                  const labels = { wrinkles: "Wrinkle Smoothness", firmness: "Skin Firmness", spots: "Spot Clarity", radiance: "Radiance & Glow" };
                  const humanLabel = labels[metricKey] || metricKey;

                  return (
                    <div key={metricKey} className="bg-white/50 border border-white/60 rounded-2xl p-4 shadow-sm">
                      <div className="text-sm font-semibold text-primary mb-3">{humanLabel}</div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-muted line-clamp-1 flex-1 pr-2">{result.scenarioA.label}:</span>
                        <span className="text-sm font-semibold text-sage">{scoreA}</span>
                      </div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs text-muted line-clamp-1 flex-1 pr-2">{result.scenarioB.label}:</span>
                        <span className="text-sm font-semibold text-muted">{scoreB}</span>
                      </div>
                      <div className="pt-3 border-t border-black/5 flex justify-between items-center">
                        <span className="text-xs font-medium text-muted uppercase tracking-wider">Improvement</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          deltaVal > 0 ? 'bg-sage/15 text-sage' : deltaVal < 0 ? 'bg-red-50/80 text-red-800 border border-red-200' : 'bg-black/5 text-muted'
                        }`}>
                          {deltaVal > 0 ? `+${deltaVal} ↑` : deltaVal < 0 ? `${deltaVal} ↓` : deltaVal}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {!simConfirmed ? (
              <div className="tk-glass rounded-3xl p-6 border border-white/50 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="keepPhoto"
                    checked={keepPhoto}
                    onChange={(e) => setKeepPhoto(e.target.checked)}
                    disabled={isSavingPrivacy}
                    className="w-4 h-4 rounded border-black/20 text-[#8A9A5B] focus:ring-[#8A9A5B]"
                  />
                  <label htmlFor="keepPhoto" className="text-sm font-medium text-primary cursor-pointer select-none">
                    Keep this photo attached to my results
                  </label>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={handleDiscardSimulation}
                    disabled={isSavingPrivacy}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-semibold text-muted bg-white/50 hover:bg-white hover:text-red-600 transition-colors border border-white/60 shadow-sm disabled:opacity-50"
                  >
                    Delete Results
                  </button>
                  <button
                    onClick={handleConfirmSimulation}
                    disabled={isSavingPrivacy}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#8A9A5B] hover:bg-[#7A8A4B] transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSavingPrivacy ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    Save Results
                  </button>
                </div>
              </div>
            ) : (
              <div className="tk-glass rounded-3xl p-4 border border-sage/20 bg-sage/5 flex items-center gap-3 mt-6 justify-center text-sage text-sm font-medium">
                <Check size={16} />
                Results saved to your history.
              </div>
            )}

            </ComponentErrorFallback>
          </div>
        )}

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
                    if (loading) return;
                    let simToSet = { ...sim };
                    if (!simToSet.deltas && simToSet.scenarioA && simToSet.scenarioB) {
                      const computedDeltas = {};
                      for (const key of Object.keys(simToSet.scenarioA.projectedScores || {})) {
                        computedDeltas[key] = Math.round((simToSet.scenarioA.projectedScores[key] - simToSet.scenarioB.projectedScores[key]) * 10) / 10;
                      }
                      computedDeltas.skinAge = Math.round((simToSet.scenarioB.finalSkinAge - simToSet.scenarioA.finalSkinAge) * 10) / 10;
                      simToSet.deltas = computedDeltas;
                    }
                    setResult(simToSet);
                    
                  }}
                  className={`tk-glass rounded-2xl p-4 text-left border border-white/40 hover:border-sage/40 hover:shadow-lg transition-all group relative ${loading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                >
                  <button
                    onClick={(e) => handleDeleteSim(e, simId)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-red-100 text-red-500 hover:bg-red-500 hover:text-white transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 z-10 shadow-sm sm:focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                    title="Delete simulation"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                  <p className="text-sm font-semibold text-primary mb-3 line-clamp-2 leading-snug pr-8">
                    <span className="text-sage">{sim.scenarioA?.label || sim.name?.split(" vs ")[0] || "Scenario A"}</span>
                    <br/><span className="text-[10px] uppercase font-bold text-muted/70 tracking-wider">vs</span><br/>
                    <span className="text-orange-500">{sim.scenarioB?.label || sim.name?.split(" vs ")[1] || "Scenario B"}</span>
                  </p>
                  <div className="h-24 rounded-lg overflow-hidden bg-black/5 border border-white/50">
                    {sim.scenarioA?.imageUrl ? (
                      <img src={sim.scenarioA.imageUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full bg-[#FDFBF7] flex flex-col items-center justify-center text-sage">
                        <Sparkles size={16} />
                        <span className="text-[10px] font-medium mt-1 uppercase tracking-widest opacity-60">Private</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 text-xs font-semibold text-sage flex justify-between items-center opacity-80 group-hover:opacity-100 transition-opacity">
                    <span className="text-muted/60">{formatSimDate(sim.createdAt)}</span>
                    <span className="flex items-center gap-1">View Details <ArrowRight size={12} /></span>
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}

      </div>

      {/* Sticky Mobile Simulation CTA */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-base/90 backdrop-blur-md border-t border-black/5 z-40 pb-safe">
        <button
          onClick={handleRunSimulation}
          disabled={loading || (quotas && quotas.simulations.used >= quotas.simulations.limit)}
          className="tk-pill-btn tk-btn-primary w-full shadow-lg flex items-center justify-center gap-2 text-sm font-semibold py-3"
        >
          {loading ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
              Running Simulation...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate Simulation
            </>
          )}
        </button>
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Simulation"
        message="Are you sure you want to delete this simulation? This cannot be undone."
        onConfirm={confirmDeleteSim}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSimToDelete(null);
        }}
      />

      <ProductScanModal
        isOpen={scanModalOpen}
        onClose={() => {
          if (!isAnalyzingProduct) {
            setScanModalOpen(false);
            setProductScanError("");
          }
        }}
        onSelectFile={handleProductFileSelected}
        isAnalyzing={isAnalyzingProduct}
        error={productScanError}
      />
    </div>
  );
}