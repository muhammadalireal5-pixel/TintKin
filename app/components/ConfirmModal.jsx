"use client";

import AnimatedModal from "./AnimatedModal";

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onCancel}
      variant="center"
      zIndex={100}
      ariaLabel={title}
      panelClassName="tk-glass bg-white/70 w-full max-w-sm rounded-2xl p-6 shadow-xl"
    >
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-display font-semibold text-primary">
          {title}
        </h3>
        <p className="text-sm text-muted">
          {message}
        </p>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="tk-pill-btn tk-btn-ghost px-4 py-2 text-sm text-muted hover:text-primary transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="tk-pill-btn bg-red-500/90 text-white hover:bg-red-600 px-4 py-2 text-sm shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          Delete
        </button>
      </div>
    </AnimatedModal>
  );
}
