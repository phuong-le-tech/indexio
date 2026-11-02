const ROWS = 6;

export function LinkListSkeleton() {
  return (
    <div role="status" aria-label="Loading links">
      <span className="sr-only">Loading your library</span>
      <ul aria-hidden="true" className="catalogue-grid">
        {Array.from({ length: ROWS }).map((_, i) => (
          <li key={i} className="flex min-h-64 min-w-0 animate-pulse flex-col gap-5 border border-[var(--color-line)] p-5">
            <span className="w-8 shrink-0 font-mono text-[length:var(--text-xs)] text-[var(--color-ink-3)]">{String(i + 1).padStart(2, "0")}</span>
            <div className="flex flex-1 flex-col gap-3">
              <div className="h-3 w-2/5 rounded-[var(--radius-sm)] bg-[var(--color-skeleton)]" />
              <div className="h-6 w-3/5 rounded-[var(--radius-sm)] bg-[var(--color-skeleton)]" />
              <div className="h-3 w-4/5 rounded-[var(--radius-sm)] bg-[var(--color-skeleton)]" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
