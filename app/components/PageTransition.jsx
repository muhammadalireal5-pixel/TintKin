"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// Route-change fade/slide. Navigation chrome lives in AppShell.
export default function PageTransition({ children }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 flex flex-col w-full min-w-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
