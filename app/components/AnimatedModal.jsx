"use client";

import { useEffect, useSyncExternalStore, Fragment } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls } from "framer-motion";

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

const MOBILE_QUERY = "(max-width: 639px)";
function subscribeMobile(callback) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}
function useIsMobile() {
  return useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(MOBILE_QUERY).matches,
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

// Solid, warm surface that matches the app's cards instead of frosted glass.
const SURFACE = "bg-[#FDFBF7] text-primary border border-[rgba(44,62,80,0.08)] shadow-[0_24px_64px_-16px_rgba(44,62,80,0.35)]";

const SIZES = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
};

const DESKTOP = {
  center: {
    wrapper: "fixed inset-0 flex items-center justify-center p-6",
    shape: "w-full rounded-3xl max-h-[min(85vh,820px)] overflow-y-auto overscroll-contain",
    panel: {
      initial: { opacity: 0, scale: 0.96, y: 8 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.97, y: 6 },
      transition: { duration: 0.22, ease: EASE },
    },
  },
  sheet: {
    wrapper: "fixed inset-0 flex justify-end",
    shape: "w-full h-full overflow-y-auto overscroll-contain border-y-0 border-r-0",
    panel: {
      initial: { x: "100%" },
      animate: { x: 0 },
      exit: { x: "100%" },
      transition: { duration: 0.32, ease: EASE },
    },
  },
};

// On phones every variant becomes a bottom sheet: thumb-reachable actions,
// a drag handle, swipe-down to dismiss and room for the home indicator.
const MOBILE = {
  wrapper: "fixed inset-0 flex items-end justify-center",
  shape: "w-full rounded-t-[28px] max-h-[92dvh] overflow-y-auto overscroll-contain border-b-0 pb-[env(safe-area-inset-bottom)]",
  panel: {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" },
    transition: { duration: 0.34, ease: EASE },
  },
};

const DISMISS_OFFSET = 110;
const DISMISS_VELOCITY = 600;

/**
 * Shared enter/exit animated modal shell (scrim fade + panel transition) on
 * top of a body-level portal. Owns the surface, shape and open/close mechanics
 * (escape key, scroll lock, backdrop click, swipe-to-dismiss on mobile);
 * `panelClassName` styles the inner content (padding, layout).
 */
export default function AnimatedModal({
  isOpen,
  onClose,
  children,
  variant = "center",
  size = "md",
  zIndex = 100,
  closeOnBackdrop = true,
  panelClassName = "",
  role = "dialog",
  ariaLabel,
}) {
  const mounted = useMounted();
  const isMobile = useIsMobile();
  const dragControls = useDragControls();

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

  const config = isMobile ? MOBILE : DESKTOP[variant === "sheet" ? "sheet" : "center"];
  const width = variant === "sheet" && !isMobile ? "max-w-sm" : SIZES[size] || SIZES.md;
  const canSwipeClose = isMobile && closeOnBackdrop;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <Fragment>
          <motion.div
            key="backdrop"
            className="fixed inset-0 bg-[#2C3E50]/45"
            style={{ zIndex }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden="true"
          />
          <div
            className={config.wrapper}
            style={{ zIndex: zIndex + 1 }}
            onClick={closeOnBackdrop ? onClose : undefined}
          >
            <motion.div
              key="panel"
              role={role}
              aria-modal="true"
              aria-label={ariaLabel}
              className={`relative ${SURFACE} ${config.shape} ${width}`}
              onClick={(e) => e.stopPropagation()}
              initial={config.panel.initial}
              animate={config.panel.animate}
              exit={config.panel.exit}
              transition={config.panel.transition}
              drag={canSwipeClose ? "y" : false}
              dragListener={false}
              dragControls={dragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.7 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > DISMISS_OFFSET || info.velocity.y > DISMISS_VELOCITY) onClose?.();
              }}
            >
              {isMobile && (
                <div
                  className="sticky top-0 z-30 mx-auto -mb-6 flex h-6 w-24 justify-center pt-2.5 touch-none cursor-grab"
                  onPointerDown={canSwipeClose ? (e) => dragControls.start(e) : undefined}
                  aria-hidden="true"
                >
                  <span className="h-1 w-10 rounded-full bg-[#2C3E50]/20" />
                </div>
              )}
              <div className={panelClassName}>{children}</div>
            </motion.div>
          </div>
        </Fragment>
      )}
    </AnimatePresence>,
    document.body
  );
}
