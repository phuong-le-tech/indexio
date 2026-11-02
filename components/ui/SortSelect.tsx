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
      className={`h-11 shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 font-mono text-[length:var(--text-xs)] text-[var(--color-ink-2)] outline-none hover:bg-[var(--color-surface-hover)] focus-visible:border-[var(--color-accent)] ${FOCUS_RING}`}
    >
      {SORT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
