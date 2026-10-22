"use client";

import { useState } from "react";
import { FOCUS_RING } from "@/components/ui/styles";
import { getTagColor } from "@/lib/tagColors";
import type { Tag } from "@/lib/types";

interface TagFilterProps {
  tags: Tag[];
  activeTag: string | null;
  onSelect: (tag: string | null) => void;
  totalCount: number;
}

export function TagFilter({ tags, activeTag, onSelect, totalCount }: TagFilterProps) {
  const [showAll, setShowAll] = useState(false);

  if (tags.length === 0) return null;

  const used = tags.filter((t) => t.link_count > 0);
  const unused = tags.filter((t) => t.link_count === 0);
  // Never hide the active tag, even if it has no links (e.g. reached via a
  // linkable search-filtered URL) - collapsing it out from under the user
  // would silently change what "active" means.
  const activeIsUnused = activeTag !== null && unused.some((t) => t.name === activeTag);
  const visible = showAll || activeIsUnused ? tags : used;
  const hiddenCount = tags.length - visible.length;

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Pill label="All" count={totalCount} active={activeTag === null} onClick={() => onSelect(null)} />
      {visible.map((tag) => (
        <Pill
          key={tag.id}
          label={tag.name}
          count={tag.link_count}
          active={activeTag === tag.name}
          onClick={() => onSelect(tag.name)}
          color={getTagColor(tag.name)}
        />
      ))}
      {!showAll && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className={`shrink-0 rounded-[var(--radius-sm)] px-1 text-[var(--text-xs)] whitespace-nowrap text-[var(--color-ink-3)] underline decoration-dotted underline-offset-2 hover:text-[var(--color-ink)] ${FOCUS_RING}`}
        >
          +{hiddenCount} more
        </button>
      )}
      {showAll && unused.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className={`shrink-0 rounded-[var(--radius-sm)] px-1 text-[var(--text-xs)] whitespace-nowrap text-[var(--color-ink-3)] underline decoration-dotted underline-offset-2 hover:text-[var(--color-ink)] ${FOCUS_RING}`}
        >
          Show less
        </button>
      )}
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
      className={`flex shrink-0 items-center gap-2 rounded-[var(--radius-full)] border px-3 py-1.5 text-[var(--text-xs)] whitespace-nowrap transition-colors ${FOCUS_RING} ${
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
