"use client";

import { getTagColor } from "@/lib/tagColors";
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
          color={getTagColor(tag.name)}
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
  color?: { bg: string; border: string; text: string };
}

function Pill({ label, count, active, onClick, color }: PillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={
        active && color
          ? { background: color.bg, borderColor: color.border, color: color.text }
          : undefined
      }
      className={`flex items-center gap-2 rounded-[var(--radius-full)] border px-3 py-1.5 text-[var(--text-xs)] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-accent)]/20 ${
        active
          ? color
            ? "font-medium focus-visible:border-[var(--color-accent)]"
            : "border-[var(--color-accent-line)] bg-[var(--color-accent-bg)] font-medium text-[var(--color-accent)] focus-visible:border-[var(--color-accent)]"
          : "border-[var(--color-hairline)] bg-transparent text-[var(--color-ink-2)] hover:border-[var(--color-line)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)] focus-visible:border-[var(--color-accent)]"
      }`}
    >
      {!active && color && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: color.text }}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
      <span className="font-mono text-[var(--text-2xs)] opacity-75">{count}</span>
    </button>
  );
}
