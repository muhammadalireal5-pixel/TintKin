"use client";

import { createContext, useContext, useState, useCallback } from "react";
import Toast from "./Toast";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback(({ type, title, message, duration = 4000 }) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setToasts((prev) => {
      const newToasts = [...prev, { id, type, title, message, duration }];
      if (newToasts.length > 3) {
        return newToasts.slice(1);
      }
      return newToasts;
    });
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="assertive"
        className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-50 flex-col gap-2 justify-end sm:justify-start"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="flex w-full flex-col items-center sm:items-end">
            <Toast
              id={toast.id}
              type={toast.type}
              title={toast.title}
              message={toast.message}
              duration={toast.duration}
              onClose={removeToast}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
