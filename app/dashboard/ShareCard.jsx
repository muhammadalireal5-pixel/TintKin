"use client";

import { useRef, useState } from "react";
import * as htmlToImage from "html-to-image";
import { Share2, Download } from "lucide-react";

export default function ShareCard({ scores, overallScore, skinAge, realAge }) {
  const cardRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setLoading(true);
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = "my-skin-score.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Failed to generate image.");
    }
    setLoading(false);
  };

  return (
    <div className="tk-glass p-8 rounded-3xl w-full flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-6">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted">Share Progress</p>
        <button onClick={handleDownload} disabled={loading} className="flex items-center gap-2 text-xs font-medium text-sage hover:text-sage/80 transition bg-sage/10 px-3 py-1.5 rounded-full">
          {loading ? "Capturing..." : <><Download size={14} /> Download Card</>}
        </button>
      </div>
      
      <div 
        ref={cardRef} 
        className="w-full max-w-sm bg-gradient-to-br from-white to-sage/10 p-8 rounded-[2rem] border border-white shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-sage/20 rounded-full blur-3xl -translate-y-10 translate-x-10"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-lavender/30 rounded-full blur-2xl translate-y-10 -translate-x-10"></div>
        
        <div className="relative z-10 text-center">
          <img src="/icon.png" alt="TintKin" className="w-16 h-auto mx-auto mb-4 drop-shadow-sm" />
          
          <h3 className="font-display text-3xl text-primary mb-1">My Skin Score</h3>
          <p className="text-xs text-muted font-medium tracking-widest uppercase mb-8">Powered by AI</p>

          <div className="flex justify-center items-end gap-2 mb-8">
            <span className="text-7xl font-display font-medium text-sage leading-none">{overallScore}</span>
            <span className="text-xl text-muted font-medium mb-2">/ 100</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white/50">
              <p className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-1">Real Age</p>
              <p className="text-2xl font-display text-primary">{realAge}</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white/50">
              <p className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-1">Skin Age</p>
              <p className="text-2xl font-display text-primary">{skinAge}</p>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-black/[0.06] flex items-center justify-between">
            <p className="text-[10px] text-muted tracking-widest uppercase font-semibold">Join me on TintKin</p>
            <p className="text-[10px] text-[#8A9A5B] font-semibold tracking-wider">tintkin.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
