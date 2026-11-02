"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  disabled?: boolean;
  danger?: boolean;
  error?: string | null;
  fallbackFocusRef: RefObject<HTMLElement | null>;
}

export function ConfirmDialog({
  open, title, description, children, confirmLabel, onConfirm, onCancel,
  busy = false, disabled = false, danger = false, error, fallbackFocusRef,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const fallback = fallbackFocusRef.current;
    dialog.showModal();
    cancelRef.current?.focus();
    return () => {
      dialog.close();
      // Wait for deleted/filtered rows to leave the DOM before choosing a focus target.
      requestAnimationFrame(() => {
        if (dialog.open) return;
        const target = trigger?.isConnected && !trigger.matches(":disabled") ? trigger : fallback;
        if (target?.isConnected) target.focus();
      });
    };
  }, [open, fallbackFocusRef]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
        )).filter((element) => !element.closest("fieldset:disabled"));
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first) {
          event.preventDefault();
          event.currentTarget.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6 text-[var(--color-ink)] shadow-xl backdrop:bg-black/50"
    >
      <h2 id={titleId} className="break-words text-[var(--text-lg)] font-semibold">{title}</h2>
      <div id={descriptionId} className="mt-3 break-words text-[var(--text-sm)] text-[var(--color-ink-2)]">{description}</div>
      {children && <fieldset disabled={busy} className="mt-4 min-w-0">{children}</fieldset>}
      {error && <p role="alert" className="mt-4 text-[var(--text-sm)] text-[var(--color-danger)]">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button ref={cancelRef} onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant={danger ? "dangerSolid" : "primary"} onClick={onConfirm} disabled={busy || disabled}>
          {busy ? "Saving..." : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
