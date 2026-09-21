"use client";

import { useEffect, useState } from "react";

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
        className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-hairline)] text-[var(--text-2xs)] text-[var(--color-ink-3)] hover:border-[var(--color-line)] hover:text-[var(--color-ink)]"
      >
        ?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[var(--text-base)] font-semibold text-[var(--color-ink)]">
                Keyboard shortcuts
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-[var(--text-sm)] text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
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
                  <kbd className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-inset)] px-1.5 py-0.5 font-mono text-[var(--text-2xs)] text-[var(--color-ink-3)]">
                    {s.keys}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
