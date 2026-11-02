"use client";

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-inset)] px-1.5 font-mono text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
      {children}
    </kbd>
  );
}
