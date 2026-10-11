"use client";

import { useState } from "react";
import { ChevronDown, Clock, ListChecks, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProductImage from "./ProductImage";
import { getProductGuidance } from "@/lib/constants/productGuidance";

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-black/5 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-3 py-2.5 text-left group"
        aria-expanded={open}
      >
        <span className="text-xs font-medium text-primary group-hover:text-sage transition-colors leading-snug">{q}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted shrink-0 mt-0.5"
        >
          <ChevronDown size={13} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="text-xs text-muted leading-relaxed pb-3 pr-5">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProductGuideCard({ type, formula, description }) {
  const [expanded, setExpanded] = useState(false);
  const guidance = getProductGuidance(type);

  return (
    <div className="tk-glass p-6 rounded-3xl flex flex-col items-center text-center relative overflow-hidden">
      <div className="relative w-32 h-32 rounded-full overflow-hidden mb-6 shadow-md border-2 border-white/50">
        <ProductImage type={type} alt={type} className="object-cover" />
      </div>
      <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-1">{type}</p>
      <h3 className="text-lg font-display text-primary mb-3">{formula}</h3>
      <p className="text-sm text-muted leading-relaxed">{description}</p>

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-sage hover:text-primary transition-colors"
        aria-expanded={expanded}
      >
        {expanded ? "Hide details" : "Why & how to use it"}
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden w-full"
          >
            <div className="mt-5 pt-5 border-t border-black/5 text-left w-full space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Clock size={12} className="text-sage" />
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">When to use it</p>
                </div>
                <p className="text-xs text-primary leading-relaxed">{guidance.when}</p>
              </div>

              {guidance.how?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ListChecks size={12} className="text-sage" />
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">How to use it</p>
                  </div>
                  <ul className="space-y-1">
                    {guidance.how.map((step, i) => (
                      <li key={i} className="text-xs text-muted leading-relaxed flex gap-1.5">
                        <span className="text-sage">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {guidance.faqs?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <HelpCircle size={12} className="text-sage" />
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-muted">Common questions</p>
                  </div>
                  <div>
                    {guidance.faqs.map((faq, i) => (
                      <FaqItem key={i} q={faq.q} a={faq.a} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
