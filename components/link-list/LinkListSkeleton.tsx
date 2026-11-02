const ROW_IDS = ["01", "02", "03", "04", "05", "06"];

export function LinkListSkeleton() {
  return (
    <div>
      <output aria-label="Loading links" className="sr-only">Loading your library</output>
      <ul aria-hidden="true" className="catalogue-grid">
        {ROW_IDS.map((id) => (
          <li key={id} className="flex min-h-64 min-w-0 animate-pulse flex-col gap-5 border border-[var(--color-line)] p-5">
            <span className="w-8 shrink-0 font-mono text-[length:var(--text-xs)] text-[var(--color-ink-3)]">{id}</span>
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
