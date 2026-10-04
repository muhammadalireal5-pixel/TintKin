"use client";

import { useEffect, useSyncExternalStore, Fragment } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

const EASE = [0.16, 1, 0.3, 1];

// Reference-counted so two modals open at once (e.g. Settings + its nested
// delete-confirmation) don't have the inner one's close unlock scroll while
// the outer one is still open.
let scrollLockCount = 0;
function lockScroll() {
  if (scrollLockCount === 0) document.body.style.overflow = "hidden";
  scrollLockCount++;
}
function unlockScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) document.body.style.overflow = "";
}

const VARIANTS = {
  center: {
    wrapperClassName: "fixed inset-0 flex items-center justify-center p-4",
    panel: {
      initial: { opacity: 0, scale: 0.95, y: 8 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.96, y: 6 },
      transition: { duration: 0.25, ease: EASE },
    },
  },
  sheet: {
    wrapperClassName: "fixed inset-0 flex justify-end",
    panel: {
      initial: { x: "100%" },
      animate: { x: 0 },
      exit: { x: "100%" },
      transition: { duration: 0.32, ease: EASE },
    },
  },
  "bottom-sheet": {
    wrapperClassName: "fixed inset-0 flex items-end justify-center sm:items-center",
    panel: {
      initial: { y: "100%" },
      animate: { y: 0 },
      exit: { y: "100%" },
      transition: { duration: 0.32, ease: EASE },
    },
  },
};

/**
 * Shared enter/exit animated modal shell (backdrop fade + panel transition) on
 * top of a body-level portal. Content/behavior stays in the caller; this only
 * owns open/close mechanics (escape key, scroll lock, backdrop click, motion).
 */
export default function AnimatedModal({
  isOpen,
  onClose,
  children,
  variant = "center",
  zIndex = 100,
  closeOnBackdrop = true,
  panelClassName = "",
  role = "dialog",
  ariaLabel,
}) {
  const mounted = useMounted();

  useEffect(() => {
    if (!isOpen) return;
    lockScroll();
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const config = VARIANTS[variant] || VARIANTS.center;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <Fragment>
          <motion.div
            key="backdrop"
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            style={{ zIndex }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden="true"
          />
          <div
            className={config.wrapperClassName}
            style={{ zIndex: zIndex + 1 }}
            onClick={closeOnBackdrop ? onClose : undefined}
          >
            <motion.div
              key="panel"
              role={role}
              aria-modal="true"
              aria-label={ariaLabel}
              className={`relative ${panelClassName}`}
              onClick={(e) => e.stopPropagation()}
              initial={config.panel.initial}
              animate={config.panel.animate}
              exit={config.panel.exit}
              transition={config.panel.transition}
            >
              {children}
            </motion.div>
          </div>
        </Fragment>
      )}
    </AnimatePresence>,
    document.body
  );
}
