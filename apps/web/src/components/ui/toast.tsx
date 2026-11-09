'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (props: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 3500 }: Omit<Toast, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: Toast = { id, type, title, message, duration };
      setToasts((prev) => [...prev.slice(-4), newToast]); // keep max 5 toasts

      if (duration > 0) {
        window.setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss],
  );

  const success = useCallback(
    (title: string, message?: string) => showToast({ type: 'success', title, message }),
    [showToast],
  );
  const error = useCallback(
    (title: string, message?: string) => showToast({ type: 'error', title, message, duration: 5000 }),
    [showToast],
  );
  const warning = useCallback(
    (title: string, message?: string) => showToast({ type: 'warning', title, message, duration: 4000 }),
    [showToast],
  );
  const info = useCallback(
    (title: string, message?: string) => showToast({ type: 'info', title, message }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, success, error, warning, info, dismiss }}>
      {children}
      {/* Toast Viewport */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex max-w-sm w-full flex-col gap-2 pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
            error: <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />,
            warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
            info: <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />,
          };

          const borders = {
            success: 'border-emerald-200 bg-white shadow-emerald-500/10',
            error: 'border-red-200 bg-white shadow-red-500/10',
            warning: 'border-amber-200 bg-white shadow-amber-500/10',
            info: 'border-blue-200 bg-white shadow-blue-500/10',
          };

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 shadow-xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${borders[toast.type]}`}
            >
              {icons[toast.type]}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 leading-snug">{toast.title}</p>
                {toast.message && (
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{toast.message}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Close notification"
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded-lg transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback safe dummy if context is missing in testing
    return {
      toasts: [],
      showToast: () => {},
      success: (msg: string) => console.log('Toast success:', msg),
      error: (msg: string) => console.error('Toast error:', msg),
      warning: (msg: string) => console.warn('Toast warning:', msg),
      info: (msg: string) => console.info('Toast info:', msg),
      dismiss: () => {},
    };
  }
  return context;
}
