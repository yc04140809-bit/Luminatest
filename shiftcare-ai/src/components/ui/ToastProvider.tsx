import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, Undo2, XCircle } from 'lucide-react';

interface ToastOptions {
  tone?: 'success' | 'error' | 'info';
  /** 表示するアイコン付きの補足(例: 「Undoで取り消せます」) */
  hint?: string;
  durationMs?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const id = ++idRef.current;
    const duration = options?.durationMs ?? 3200;
    setToasts((prev) => [...prev, { id, message, ...options }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed left-0 right-0 bottom-20 sm:bottom-6 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto max-w-sm w-full bg-slate-800 text-white rounded-2xl shadow-lg px-4 py-3 flex items-start gap-2.5 animate-[slideUp_0.2s_ease-out]"
          >
            {t.tone === 'error' ? (
              <XCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 size={18} className="text-teal-400 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium leading-snug">{t.message}</div>
              {t.hint && (
                <div className="text-xs text-slate-300 mt-0.5 flex items-center gap-1">
                  <Undo2 size={12} />
                  {t.hint}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
