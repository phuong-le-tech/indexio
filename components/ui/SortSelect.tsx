"use client";

import { FOCUS_RING } from "@/components/ui/styles";

const SORT_OPTIONS = [
  { value: "created_desc", label: "Newest" },
  { value: "created_asc", label: "Oldest" },
  { value: "title_asc", label: "Title A-Z" },
] as const;

interface SortSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Sort links"
      className={`h-8 shrink-0 rounded-[var(--radius-full)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 text-[var(--text-xs)] text-[var(--color-ink-2)] shadow-sm outline-none hover:bg-[var(--color-surface-hover)] focus-visible:border-[var(--color-accent)] ${FOCUS_RING}`}
    >
      {SORT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
