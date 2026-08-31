"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, Info, ShieldAlert, X, Trash2, HelpCircle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

interface NotificationContextValue {
  notify: (message: string, type?: ToastType, duration?: number) => void;
  removeNotification: (id: string) => void;
  confirmDialog: (options: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Confirmation Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const removeNotification = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, type: ToastType = "info", duration: number = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = { id, message, type, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // keep max 5 toasts

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    [removeNotification]
  );

  const confirmDialog = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirmResponse = (value: boolean) => {
    if (confirmState) {
      confirmState.resolve(value);
      setConfirmState(null);
    }
  };

  return (
    <NotificationContext.Provider value={{ notify, removeNotification, confirmDialog }}>
      {children}

      {/* Global Toast Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all animate-[slideIn_0.25s_ease-out] ${
              toast.type === "success"
                ? "bg-slate-900/95 border-emerald-500/30 text-emerald-300 shadow-emerald-950/20"
                : toast.type === "error"
                ? "bg-slate-900/95 border-rose-500/30 text-rose-300 shadow-rose-950/20"
                : toast.type === "warning"
                ? "bg-slate-900/95 border-amber-500/30 text-amber-300 shadow-amber-950/20"
                : "bg-slate-900/95 border-indigo-500/30 text-indigo-300 shadow-indigo-950/20"
            }`}
          >
            <div className="mt-0.5 flex-shrink-0">
              {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {toast.type === "error" && <AlertTriangle className="w-5 h-5 text-rose-400" />}
              {toast.type === "warning" && <ShieldAlert className="w-5 h-5 text-amber-400" />}
              {toast.type === "info" && <Info className="w-5 h-5 text-indigo-400" />}
            </div>

            <div className="flex-1 text-xs leading-relaxed font-medium text-slate-200">
              {toast.message}
            </div>

            <button
              onClick={() => removeNotification(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors flex-shrink-0"
              aria-label="Dismiss Notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Global Confirmation Modal Dialog */}
      {confirmState?.isOpen && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-[fadeIn_0.15s_ease-out]">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-6 shadow-2xl relative text-center">
            
            {/* Modal Icon */}
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border ${
                confirmState.options.variant === "danger"
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  : confirmState.options.variant === "warning"
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
              }`}
            >
              {confirmState.options.variant === "danger" ? (
                <Trash2 className="w-7 h-7" />
              ) : confirmState.options.variant === "warning" ? (
                <ShieldAlert className="w-7 h-7" />
              ) : (
                <HelpCircle className="w-7 h-7" />
              )}
            </div>

            {/* Modal Content */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">
                {confirmState.options.title || "Confirm Action"}
              </h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                {confirmState.options.message}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmResponse(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 text-slate-200 font-semibold py-3 px-4 rounded-xl text-xs transition-colors"
              >
                {confirmState.options.cancelText || "Cancel"}
              </button>

              <button
                type="button"
                onClick={() => handleConfirmResponse(true)}
                className={`flex-1 font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-lg active:scale-[0.98] ${
                  confirmState.options.variant === "danger"
                    ? "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-rose-600/20"
                    : confirmState.options.variant === "warning"
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-amber-500/20"
                    : "bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-indigo-500/20"
                }`}
              >
                {confirmState.options.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}
