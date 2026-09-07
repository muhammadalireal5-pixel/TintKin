"use client";

import { useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Camera, Image as ImageIcon, Sparkles, X, Loader2 } from "lucide-react";

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export default function ProductScanModal({
  isOpen,
  onClose,
  onSelectFile,
  isAnalyzing,
  error,
}) {
  const mounted = useMounted();
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  if (!mounted || !isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectFile(file);
    }
    e.target.value = "";
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="sr-only"
        aria-hidden="true"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="sr-only"
        aria-hidden="true"
      />

      <div className="tk-glass bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 border border-white/50 shadow-2xl relative animate-scale-up">
        {!isAnalyzing && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-black/5 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}

        <div className="w-12 h-12 rounded-2xl bg-sage/15 flex items-center justify-center text-sage mb-4 shadow-sm">
          {isAnalyzing ? (
            <Loader2 size={24} className="animate-spin text-sage" />
          ) : (
            <Sparkles size={24} />
          )}
        </div>

        <h2 className="text-2xl font-display font-medium text-primary mb-2">
          {isAnalyzing ? "Analyzing Product..." : "Scan Your Product"}
        </h2>

        <p className="text-muted text-sm mb-6 leading-relaxed">
          {isAnalyzing
            ? "Our AI is analyzing the ingredient formulation and active compounds to simulate future skin impact."
            : "Take a photo of your product’s ingredients label or upload an existing photo from your device to test in the simulator."}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {isAnalyzing ? (
          <div className="py-6 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-sage/20 border-t-sage rounded-full animate-spin" />
            <p className="text-xs font-medium text-primary">Reading ingredient list...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="w-full py-3.5 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2.5 shadow-[0_4px_14px_rgba(44,62,80,0.15)] hover:bg-primary/90 transition-all cursor-pointer"
            >
              <Camera size={18} />
              <span>Take a Picture</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-gray-200" />
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase tracking-widest font-medium">
                or
              </span>
              <div className="flex-grow border-t border-gray-200" />
            </div>

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="w-full py-3.5 bg-white border border-gray-200 text-primary rounded-xl font-medium flex items-center justify-center gap-2.5 hover:bg-black/[0.02] transition-all cursor-pointer shadow-sm"
            >
              <ImageIcon size={18} className="text-sage" />
              <span>Upload Picture</span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
