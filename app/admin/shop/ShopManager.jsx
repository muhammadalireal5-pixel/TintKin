"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import {
  adminCreatePack,
  adminUpdatePack,
  adminDeletePack,
  adminRestorePack,
  adminUpdateShopSettings,
} from "@/app/lib/shop-actions";
import { useToast } from "@/app/components/ToastProvider";

const cardStyle = "bg-white/40 p-4 rounded-xl border border-[var(--tk-border-solid)]";
const inputStyle = "w-full px-3 py-2 rounded-lg border border-[var(--tk-border-solid)] bg-white/70 text-sm text-[var(--tk-text-primary)]";
const labelStyle = "text-xs font-medium text-[var(--tk-text-muted)] block mb-1";

function PackForm({ initial, onCancel, onSubmit, submitting }) {
  const [label, setLabel] = useState(initial?.label || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [credits, setCredits] = useState(initial ? String(initial.credits) : "");
  const [priceUsd, setPriceUsd] = useState(initial ? (initial.priceCents / 100).toFixed(2) : "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      label,
      description,
      credits: Number(credits),
      priceCents: Math.round(Number(priceUsd) * 100),
    });
  };

  return (
    <form onSubmit={handleSubmit} className={`${cardStyle} space-y-3`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelStyle}>Label</label>
          <input className={inputStyle} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. 500 Credits" required maxLength={80} />
        </div>
        <div>
          <label className={labelStyle}>Credits</label>
          <input className={inputStyle} type="number" min="1" step="1" value={credits} onChange={(e) => setCredits(e.target.value)} required />
        </div>
        <div>
          <label className={labelStyle}>Price (USD)</label>
          <input className={inputStyle} type="number" min="0.01" step="0.01" value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} required />
        </div>
        <div>
          <label className={labelStyle}>Description (optional)</label>
          <input className={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Shown on /shop" maxLength={300} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border border-[var(--tk-border-solid)] text-[var(--tk-text-muted)] hover:bg-black/5">
          <X size={14} /> Cancel
        </button>
        <button type="submit" disabled={submitting} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-sage/10 text-sage border border-sage/20 hover:bg-sage/20 disabled:opacity-50">
          <Save size={14} /> {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

export default function ShopManager({ initialPacks, initialSettings, loadError }) {
  const { showToast } = useToast();
  const [packs, setPacks] = useState(initialPacks);
  const [addingPack, setAddingPack] = useState(false);
  const [editingPackId, setEditingPackId] = useState(null);
  const [busyPackId, setBusyPackId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [settings, setSettings] = useState(
    initialSettings || { pricePerCreditCents: 0, minCustomCredits: 0, maxCustomCredits: 0, customProductPolarId: null }
  );
  const [pricePerCredit, setPricePerCredit] = useState(initialSettings ? String(initialSettings.pricePerCreditCents) : "");
  const [minCredits, setMinCredits] = useState(initialSettings ? String(initialSettings.minCustomCredits) : "");
  const [maxCredits, setMaxCredits] = useState(initialSettings ? String(initialSettings.maxCustomCredits) : "");
  const [savingSettings, setSavingSettings] = useState(false);

  const handleCreatePack = async (values) => {
    setSubmitting(true);
    try {
      const res = await adminCreatePack(values);
      if (res?.success) {
        setPacks((prev) => [...prev, res.pack]);
        setAddingPack(false);
        showToast({ type: "success", title: "Pack created", message: `${res.pack.label} is live on /shop.` });
      } else {
        showToast({ type: "error", title: "Create failed", message: res?.error || "Failed to create pack." });
      }
    } catch {
      showToast({ type: "error", title: "Create failed", message: "Failed to create pack." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePack = async (packId, values) => {
    setSubmitting(true);
    try {
      const res = await adminUpdatePack(packId, values);
      if (res?.success) {
        setPacks((prev) => prev.map((p) => (p.id === packId ? res.pack : p)));
        setEditingPackId(null);
        showToast({ type: "success", title: "Pack updated", message: `${res.pack.label} saved.` });
      } else {
        showToast({ type: "error", title: "Update failed", message: res?.error || "Failed to update pack." });
      }
    } catch {
      showToast({ type: "error", title: "Update failed", message: "Failed to update pack." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestorePack = async (pack) => {
    setBusyPackId(pack.id);
    try {
      const res = await adminRestorePack(pack.id);
      if (res?.success) {
        setPacks((prev) => prev.map((p) => (p.id === pack.id ? res.pack : p)));
        showToast({ type: "success", title: "Pack restored", message: `${pack.label} is back on /shop.` });
      } else {
        showToast({ type: "error", title: "Restore failed", message: res?.error || "Failed to restore pack." });
      }
    } catch {
      showToast({ type: "error", title: "Restore failed", message: "Failed to restore pack." });
    } finally {
      setBusyPackId(null);
    }
  };

  const handleDeletePack = async (pack) => {
    setBusyPackId(pack.id);
    try {
      const res = await adminDeletePack(pack.id);
      if (res?.success) {
        setPacks((prev) => prev.map((p) => (p.id === pack.id ? { ...p, active: false } : p)));
        showToast({ type: "success", title: "Pack removed", message: `${pack.label} is off /shop.` });
      } else {
        showToast({ type: "error", title: "Remove failed", message: res?.error || "Failed to remove pack." });
      }
    } catch {
      showToast({ type: "error", title: "Remove failed", message: "Failed to remove pack." });
    } finally {
      setBusyPackId(null);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await adminUpdateShopSettings({
        pricePerCreditCents: Number(pricePerCredit),
        minCustomCredits: Number(minCredits),
        maxCustomCredits: Number(maxCredits),
      });
      if (res?.success) {
        setSettings(res.settings);
        showToast({ type: "success", title: "Pricing saved", message: "Custom-amount pricing is live on /shop." });
      } else {
        showToast({ type: "error", title: "Save failed", message: res?.error || "Failed to save pricing." });
      }
    } catch {
      showToast({ type: "error", title: "Save failed", message: "Failed to save pricing." });
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-8">
      {loadError && (
        <div className="bg-red-500/10 text-red-600 text-sm p-3 rounded-lg border border-red-500/20">{loadError}</div>
      )}

      <section>
        <h2 className="text-sm font-medium text-[var(--tk-text-faint)] uppercase tracking-wider mb-3">
          Custom Amount Pricing
        </h2>
        <form onSubmit={handleSaveSettings} className={`${cardStyle} grid grid-cols-1 sm:grid-cols-4 gap-3 items-end`}>
          <div>
            <label className={labelStyle}>Price per credit (cents)</label>
            <input className={inputStyle} type="number" min="0.01" step="0.01" value={pricePerCredit} onChange={(e) => setPricePerCredit(e.target.value)} required />
          </div>
          <div>
            <label className={labelStyle}>Min credits</label>
            <input className={inputStyle} type="number" min="1" step="1" value={minCredits} onChange={(e) => setMinCredits(e.target.value)} required />
          </div>
          <div>
            <label className={labelStyle}>Max credits</label>
            <input className={inputStyle} type="number" min="1" step="1" value={maxCredits} onChange={(e) => setMaxCredits(e.target.value)} required />
          </div>
          <button type="submit" disabled={savingSettings} className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-sage/10 text-sage border border-sage/20 hover:bg-sage/20 disabled:opacity-50">
            <Save size={14} /> {savingSettings ? "Saving…" : "Save"}
          </button>
        </form>
        <p className="text-xs text-[var(--tk-text-faint)] mt-2">
          {settings.customProductPolarId
            ? "Custom-amount purchases are live on /shop."
            : "Save once to enable \"Buy a custom amount\" on /shop."}
        </p>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-[var(--tk-text-faint)] uppercase tracking-wider">Credit Packs</h2>
          {!addingPack && (
            <button onClick={() => setAddingPack(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sage/10 text-sage border border-sage/20 hover:bg-sage/20">
              <Plus size={14} /> Add Pack
            </button>
          )}
        </div>

        {addingPack && (
          <div className="mb-3">
            <PackForm onCancel={() => setAddingPack(false)} onSubmit={handleCreatePack} submitting={submitting} />
          </div>
        )}

        <div className="space-y-3">
          {packs.length === 0 && !addingPack && (
            <p className="text-sm text-[var(--tk-text-muted)]">No packs yet — add one above.</p>
          )}
          {packs.map((pack) =>
            editingPackId === pack.id ? (
              <PackForm
                key={pack.id}
                initial={pack}
                onCancel={() => setEditingPackId(null)}
                onSubmit={(values) => handleUpdatePack(pack.id, values)}
                submitting={submitting}
              />
            ) : (
              <div key={pack.id} className={`${cardStyle} flex items-center justify-between gap-4`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--tk-text-primary)]">{pack.label}</span>
                    {!pack.active && (
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-black/5 text-[var(--tk-text-faint)]">Removed</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--tk-text-muted)]">
                    {pack.credits} credits — ${(pack.priceCents / 100).toFixed(2)}
                    {pack.description ? ` · ${pack.description}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {pack.active ? (
                    <>
                      <button
                        onClick={() => setEditingPackId(pack.id)}
                        className="p-2 rounded-lg border border-[var(--tk-border-solid)] text-[var(--tk-text-muted)] hover:bg-black/5"
                        aria-label="Edit pack"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeletePack(pack)}
                        disabled={busyPackId === pack.id}
                        className="p-2 rounded-lg border border-red-500/20 text-red-600 hover:bg-red-500/10 disabled:opacity-50"
                        aria-label="Remove pack"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleRestorePack(pack)}
                      disabled={busyPackId === pack.id}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-sage/20 text-sage hover:bg-sage/10 disabled:opacity-50"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </div>
        <p className="text-xs text-[var(--tk-text-faint)] mt-3">
          Removing a pack archives it on Polar and takes it off /shop — it stays on record so past purchases still refund correctly. Restoring it reverses both.
        </p>
      </section>
    </div>
  );
}
