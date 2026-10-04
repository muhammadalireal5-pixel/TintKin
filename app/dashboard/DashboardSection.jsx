"use client";

import { useState, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MOBILE_QUERY = "(max-width: 767px)";

function subscribe(callback) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}
const getSnapshot = () => window.matchMedia(MOBILE_QUERY).matches;
const getServerSnapshot = () => false; // SSR/no-JS default: treat as desktop (expanded)

function useIsMobileViewport() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Collapsible wrapper for heavier, less day-to-day-relevant dashboard sections
 * (Trophy Case, Journey Chart). Collapsed by default on mobile to cut scroll
 * length; expanded by default on desktop where there's room to spare. Once the
 * user taps the header, their choice overrides the viewport default.
 */
export default function DashboardSection({ title, icon, children, className = "" }) {
  const isMobile = useIsMobileViewport();
  const [override, setOverride] = useState(null);
  const isOpen = override ?? !isMobile;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOverride(!isOpen)}
        className="w-full flex items-center justify-between gap-2 py-1 mb-1 group"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-xs font-semibold tracking-widest uppercase text-muted group-hover:text-primary transition-colors">
            {title}
          </p>
        </div>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted group-hover:text-primary transition-colors"
        >
          <ChevronDown size={16} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
