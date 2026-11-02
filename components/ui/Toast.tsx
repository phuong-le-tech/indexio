"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertIcon, CheckIcon, XIcon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/components/ui/styles";

const TOAST_DURATION_MS = 5000;

export type ToastTone = "info" | "success" | "error";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

type ShowToast = (message: string, tone?: ToastTone) => void;

const ToastContext = createContext<ShowToast | null>(null);

export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>");
  return show;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ShowToast>(
    (message, tone = "info") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, tone }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), TOAST_DURATION_MS)
      );
    },
    [dismiss]
  );

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach(clearTimeout);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 top-16 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const isError = toast.tone === "error";
  return (
    <div className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-raised)] py-2.5 pr-2 pl-3 shadow-lg">
      {toast.tone !== "info" && (
        <span
          className={`mt-0.5 shrink-0 ${
            isError ? "text-[var(--color-danger)]" : "text-[var(--color-accent)]"
          }`}
        >
          {isError ? <AlertIcon size={16} /> : <CheckIcon size={16} />}
        </span>
      )}
      <p className="min-w-0 flex-1 text-[length:var(--text-sm)] leading-snug break-words text-[var(--color-ink)]">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-3)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)] ${FOCUS_RING}`}
      >
        <XIcon size={14} />
      </button>
    </div>
  );
}
