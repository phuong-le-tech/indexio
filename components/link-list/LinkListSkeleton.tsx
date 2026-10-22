const ROWS = 6;

export function LinkListSkeleton() {
  return (
    <ul className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: ROWS }).map((_, i) => (
        <li
          key={i}
          className="flex animate-pulse flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface)]"
        >
          <div className="aspect-video w-full bg-[var(--color-skeleton)]" />
          <div className="flex flex-col gap-2 p-4">
            <div className="h-3 w-2/5 rounded-[var(--radius-sm)] bg-[var(--color-skeleton)]" />
            <div className="h-4 w-4/5 rounded-[var(--radius-sm)] bg-[var(--color-skeleton)]" />
            <div className="h-3 w-full rounded-[var(--radius-sm)] bg-[var(--color-skeleton)]" />
          </div>
        </li>
      ))}
    </ul>
  );
}
