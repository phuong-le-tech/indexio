"use client";

import type { Tag } from "@/lib/types";

interface TagFilterProps {
  tags: Tag[];
  activeTag: string | null;
  onSelect: (tag: string | null) => void;
  totalCount: number;
}

export function TagFilter({ tags, activeTag, onSelect, totalCount }: TagFilterProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Pill label="All" count={totalCount} active={activeTag === null} onClick={() => onSelect(null)} />
      {tags.map((tag) => (
        <Pill
          key={tag.id}
          label={tag.name}
          count={tag.link_count}
          active={activeTag === tag.name}
          onClick={() => onSelect(tag.name)}
        />
      ))}
    </div>
  );
}

interface PillProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function Pill({ label, count, active, onClick }: PillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-[var(--radius-full)] border px-3 py-1.5 text-[var(--text-xs)] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-accent)]/20 ${
        active
          ? "border-[var(--color-accent-line)] bg-[var(--color-accent-bg)] font-medium text-[var(--color-accent)] focus-visible:border-[var(--color-accent)]"
          : "border-[var(--color-hairline)] bg-transparent text-[var(--color-ink-2)] hover:border-[var(--color-line)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)] focus-visible:border-[var(--color-accent)]"
      }`}
    >
      <span>{label}</span>
      <span className="font-mono text-[var(--text-2xs)] opacity-75">{count}</span>
    </button>
  );
}
