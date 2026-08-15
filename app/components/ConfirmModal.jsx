"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
        aria-hidden="true"
      />
      
      {/* Modal Card */}
      <div 
        className="tk-glass bg-white/70 w-full max-w-sm rounded-2xl p-6 shadow-xl relative z-10 animate-fade-in animate-scale-up"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-display font-semibold text-primary">
            {title}
          </h3>
          <p className="text-sm text-muted">
            {message}
          </p>
        </div>
        
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="tk-pill-btn tk-btn-ghost px-4 py-2 text-sm text-muted hover:text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="tk-pill-btn bg-red-500/90 text-white hover:bg-red-600 px-4 py-2 text-sm shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            Delete
          </button>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-up {
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
