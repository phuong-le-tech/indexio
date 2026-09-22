const ROWS = 6;

export function LinkListSkeleton() {
  return (
    <ul className="columns-1 gap-4 sm:columns-2 xl:columns-3">
      {Array.from({ length: ROWS }).map((_, i) => (
        <li
          key={i}
          className="mb-4 flex break-inside-avoid gap-4 rounded-[var(--radius-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5"
        >
          <div className="h-5 w-5 shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-skeleton)]" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="h-4 w-3/5 rounded-[var(--radius-sm)] bg-[var(--color-skeleton)]" />
            <div className="h-3 w-full rounded-[var(--radius-sm)] bg-[var(--color-skeleton)]" />
            <div className="h-3 w-4/5 rounded-[var(--radius-sm)] bg-[var(--color-skeleton)]" />
          </div>
        </li>
      ))}
    </ul>
  );
}
