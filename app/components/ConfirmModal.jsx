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
      size="sm"
      panelClassName="p-6 pt-7 sm:pt-6"
    >
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-display font-semibold text-primary">
          {title}
        </h3>
        <p className="text-sm text-muted">
          {message}
        </p>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="tk-pill-btn tk-btn-ghost w-full sm:w-auto px-4 py-3 sm:py-2 text-sm text-muted hover:text-primary transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="tk-pill-btn bg-red-600 text-white hover:bg-red-700 w-full sm:w-auto px-4 py-3 sm:py-2 text-sm font-medium transition-colors"
        >
          Delete
        </button>
      </div>
    </AnimatedModal>
  );
}
