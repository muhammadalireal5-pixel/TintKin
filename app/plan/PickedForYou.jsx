"use client";

import { useState } from "react";
import { ChevronRight, Sparkles, X } from "lucide-react";
import AnimatedModal from "@/app/components/AnimatedModal";
import ProductImage from "@/app/dashboard/ProductImage";

/**
 * One row at the foot of the Plan: how many products were matched to the
 * profile. The shop sells scan credits, not products, so the full list opens
 * in a sheet here instead of a shop page.
 */
export default function PickedForYou({ products }) {
  const [open, setOpen] = useState(false);
  if (!Array.isArray(products) || products.length === 0) return null;
  const n = products.length;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tk-card w-full flex items-center gap-3 p-4 text-left hover:border-accent/40 transition-colors"
      >
        <span className="tk-icon-circle w-10 h-10"><Sparkles size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-primary">Picked for your skin</span>
          <span className="block text-xs text-muted">{n} {n === 1 ? "product" : "products"} matched to your profile</span>
        </span>
        <ChevronRight size={18} className="text-muted shrink-0" />
      </button>

      <AnimatedModal isOpen={open} onClose={() => setOpen(false)} size="md" ariaLabel="Picked for your skin" panelClassName="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-semibold text-primary">Picked for your skin</h2>
            <p className="text-xs text-muted">Consider a one-month supply of each.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-primary/70 bg-blush hover:text-primary">
            <X size={16} />
          </button>
        </div>
        <ul className="divide-y divide-line">
          {products.map((p, i) => (
            <li key={`${p.type}-${i}`} className="flex items-start gap-3 py-3">
              <span className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-line bg-accent-soft">
                <ProductImage type={p.type} alt={p.formula || p.type} className="object-cover" />
              </span>
              <span className="min-w-0">
                <span className="block tk-eyebrow">{p.type}</span>
                <span className="block text-sm font-semibold text-primary">{p.formula}</span>
                {p.description && <span className="block text-xs text-muted leading-relaxed mt-0.5">{p.description}</span>}
              </span>
            </li>
          ))}
        </ul>
      </AnimatedModal>
    </>
  );
}
