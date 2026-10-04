"use client";

import { motion } from "framer-motion";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

/**
 * Framer Motion stagger wrapper for the dashboard sections. Replaces the old
 * fixed-delay `tk-anim-N` classes: the dashboard is a Server Component (it
 * awaits data), so these small client wrappers own the animation and simply
 * receive the already-rendered server content as `children`.
 */
export function StaggerContainer({ children, className }) {
  return (
    <motion.div className={className} variants={container} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, style }) {
  return (
    <motion.div className={className} style={style} variants={item}>
      {children}
    </motion.div>
  );
}
