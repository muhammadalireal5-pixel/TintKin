"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthContext } from "../context/AuthContext";
import MobileBottomNav from "./MobileBottomNav";

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const { user } = useAuthContext();

  return (
    <>
      <main className={`flex-1 flex flex-col w-full ${user ? "pb-safe-nav" : ""}`}>
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
      </main>
      <MobileBottomNav />
    </>
  );
}
