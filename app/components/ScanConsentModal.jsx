"use client";

import { useState } from "react";
import Link from "next/link";
import AnimatedModal from "./AnimatedModal";
import { PHOTO_PRIVACY } from "@/lib/constants/privacy";

/**
 * One-time gate shown right before a user's first scan ever uploads a photo
 * (not at sign-up — no photo exists yet at that point). Not dismissible via
 * backdrop/Escape: the user must make both choices to proceed.
 */
export default function ScanConsentModal({ isOpen, onAccept, submitting }) {
  const [agreed, setAgreed] = useState(false);
  const [photoPrivacy, setPhotoPrivacy] = useState(PHOTO_PRIVACY.STORE);

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={() => {}}
      closeOnBackdrop={false}
      variant="center"
      zIndex={100}
      ariaLabel="Before your first scan"
      size="sm"
      panelClassName="p-6 pt-7 sm:pt-6"
    >
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-display font-semibold text-primary">Before your first scan</h3>
        <p className="text-sm text-muted">
          Your photo is used to analyze your skin. Choose how it is handled, and confirm you agree to our terms.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative flex items-center justify-center w-4 h-4 mt-0.5">
            <input
              type="radio"
              name="scanConsentPhotoPrivacy"
              value={PHOTO_PRIVACY.STORE}
              checked={photoPrivacy === PHOTO_PRIVACY.STORE}
              onChange={() => setPhotoPrivacy(PHOTO_PRIVACY.STORE)}
              className="appearance-none w-4 h-4 rounded-full border border-black/20 checked:border-sage transition-colors"
            />
            {photoPrivacy === PHOTO_PRIVACY.STORE && <div className="absolute w-2 h-2 rounded-full bg-sage" />}
          </div>
          <div className="flex-1 text-sm text-primary">
            <p className="font-medium">Store my photo (Recommended)</p>
            <p className="text-xs text-muted mt-0.5">Keeps your latest selfie for fast What-If simulations and your journal display.</p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative flex items-center justify-center w-4 h-4 mt-0.5">
            <input
              type="radio"
              name="scanConsentPhotoPrivacy"
              value={PHOTO_PRIVACY.DELETE}
              checked={photoPrivacy === PHOTO_PRIVACY.DELETE}
              onChange={() => setPhotoPrivacy(PHOTO_PRIVACY.DELETE)}
              className="appearance-none w-4 h-4 rounded-full border border-black/20 checked:border-sage transition-colors"
            />
            {photoPrivacy === PHOTO_PRIVACY.DELETE && <div className="absolute w-2 h-2 rounded-full bg-sage" />}
          </div>
          <div className="flex-1 text-sm text-primary">
            <p className="font-medium">Delete my photo immediately</p>
            <p className="text-xs text-muted mt-0.5">Analyzed, then instantly deleted. Simulations will need a fresh upload.</p>
          </div>
        </label>
      </div>

      <label className="mt-5 flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-black/20 text-sage focus:ring-sage"
        />
        <span className="text-sm text-primary">
          I agree to the{" "}
          <Link href="/terms" target="_blank" className="underline hover:text-sage">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" target="_blank" className="underline hover:text-sage">Privacy Policy</Link>.
        </span>
      </label>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={!agreed || submitting}
          onClick={() => onAccept(photoPrivacy)}
          className="tk-pill-btn bg-primary text-white hover:bg-primary/90 w-full sm:w-auto px-5 py-3 sm:py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Saving…" : "Agree & continue"}
        </button>
      </div>
    </AnimatedModal>
  );
}
