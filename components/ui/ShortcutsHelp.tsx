"use client";

import { useEffect, useState } from "react";
import { Kbd } from "@/components/ui/Kbd";
import { FOCUS_RING } from "@/components/ui/styles";

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: "/", description: "Focus search" },
  { keys: "Esc", description: "Clear search, or close whatever's open" },
  { keys: "Enter", description: "Save the link you're adding" },
  { keys: "?", description: "Show this list" },
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (e.key === "?" && !isTyping) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Keyboard shortcuts"
        className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--text-sm)] text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)] ${FOCUS_RING}`}
      >
        ?
      </button>

      {open && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close keyboard shortcuts"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-scrim)] px-5"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              setOpen(false);
            }
          }}
        >
          <div className="w-full max-w-sm animate-pop-in rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-raised)] p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[var(--text-base)] font-semibold text-[var(--color-ink)]">
                Keyboard shortcuts
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-3)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)] ${FOCUS_RING}`}
              >
                ×
              </button>
            </div>
            <ul className="flex flex-col gap-2.5">
              {SHORTCUTS.map((s) => (
                <li key={s.keys} className="flex items-center justify-between gap-4">
                  <span className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
                    {s.description}
                  </span>
                  <Kbd>{s.keys}</Kbd>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
