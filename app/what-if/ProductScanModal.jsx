"use client";

import { useRef } from "react";
import { Camera, Image as ImageIcon, Sparkles, X, Loader2 } from "lucide-react";
import AnimatedModal from "@/app/components/AnimatedModal";

export default function ProductScanModal({
  isOpen,
  onClose,
  onSelectFile,
  isAnalyzing,
  error,
}) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectFile(file);
    }
    e.target.value = "";
  };

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      variant="center"
      zIndex={50}
      closeOnBackdrop={false}
      ariaLabel="Scan Your Product"
      panelClassName="p-6 pt-8 sm:p-8"
    >
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

      {!isAnalyzing && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-primary hover:bg-accent-soft transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      )}

      <div className="tk-icon-circle w-12 h-12 mb-4">
        {isAnalyzing ? (
          <Loader2 size={24} className="animate-spin text-accent" />
        ) : (
          <Sparkles size={24} />
        )}
      </div>

      <h2 className="text-2xl font-semibold text-primary mb-2">
        {isAnalyzing ? "Analyzing Product..." : "Scan Your Product"}
      </h2>

      <p className="text-muted text-sm mb-6 leading-relaxed">
        {isAnalyzing
          ? "Our AI is analyzing the ingredient formulation and active compounds to simulate future skin impact."
          : "Take a photo of your product’s ingredients label or upload an existing photo from your device to test in the simulator."}
      </p>

      {error && (
        <div className="mb-4 p-3 bg-danger-soft border border-danger/20 text-danger text-xs rounded-2xl">
          {error}
        </div>
      )}

      {isAnalyzing ? (
        <div className="py-6 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-[3px] border-accent/20 border-t-accent rounded-full animate-spin" />
          <p className="text-xs font-medium text-primary">Reading ingredient list...</p>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="tk-pill-btn tk-btn-primary w-full py-3.5 gap-2.5"
          >
            <Camera size={18} />
            <span>Take a Picture</span>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-line" />
            <span className="flex-shrink-0 mx-4 text-muted text-xs uppercase tracking-widest font-semibold">
              or
            </span>
            <div className="flex-grow border-t border-line" />
          </div>

          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="tk-pill-btn tk-btn-ghost w-full py-3.5 gap-2.5"
          >
            <ImageIcon size={18} className="text-accent" />
            <span>Upload Picture</span>
          </button>
        </div>
      )}
    </AnimatedModal>
  );
}
