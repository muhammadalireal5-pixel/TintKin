"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Sparkles, Activity } from "lucide-react";

const ICONS = {
  success: <CheckCircle2 className="w-5 h-5 text-sage" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  habit: <Sparkles className="w-5 h-5 text-lavender" />,
  workout: <Activity className="w-5 h-5 text-primary" />,
  product: <Sparkles className="w-5 h-5 text-orange-400" />
};

export default function Toast({ id, type = "success", title, message, duration = 4000, onClose }) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClosing(true);
      setTimeout(() => onClose(id), 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, id, onClose]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <div 
      className={`pointer-events-auto w-full max-w-sm overflow-hidden tk-glass shadow-lg transition-all duration-300 border border-white/40
      ${isClosing ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'}`}
      style={{
        animation: !isClosing ? 'slideInUp 0.3s ease-out forwards' : 'none'
      }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {ICONS[type] || ICONS.success}
          </div>
          <div className="ml-1 w-0 flex-1 pt-0.5">
            {title && <p className="text-sm font-medium text-primary">{title}</p>}
            {message && <p className="mt-1 text-xs text-muted">{message}</p>}
          </div>
          <div className="ml-4 flex flex-shrink-0">
            <button
              type="button"
              className="inline-flex rounded-md bg-transparent text-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2"
              onClick={handleClose}
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className="h-1 bg-black/5 w-full">
        <div 
          className="h-full bg-primary/20" 
          style={{
            animation: `shrink ${duration}ms linear forwards`
          }}
        />
      </div>
      <style jsx>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(1rem) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
