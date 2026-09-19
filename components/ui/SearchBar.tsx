"use client";

import { useEffect, useRef, useState } from "react";
import { SearchIcon, XIcon } from "@/components/ui/Icon";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  totalCount: number;
  resultCount: number;
}

export function SearchBar({ value, onChange, totalCount, resultCount }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        onChange("");
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [onChange]);

  const showHint = !focused && value === "";
  const showResult = value !== "";

  return (
    <div
      className={`flex h-14 items-center gap-3 rounded-[var(--radius-lg)] border bg-[var(--color-surface)] px-5 transition-colors ${
        focused
          ? "border-[var(--color-accent)] ring-[3px] ring-[var(--color-accent)]/20"
          : "border-[var(--color-hairline)]"
      }`}
    >
      <SearchIcon
        size={20}
        className={focused ? "text-[var(--color-accent)]" : "text-[var(--color-ink-2)] shrink-0"}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={`Search ${totalCount} link${totalCount === 1 ? "" : "s"}`}
        className="min-w-0 flex-1 bg-transparent text-[var(--text-base)] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
      />
      {showResult && (
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-[var(--text-xs)] text-[var(--color-ink-3)]">
            {resultCount} result{resultCount === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-3)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]"
          >
            <XIcon size={14} />
          </button>
        </div>
      )}
      {showHint && (
        <kbd className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-inset)] px-1.5 py-0.5 font-mono text-[var(--text-2xs)] text-[var(--color-ink-3)]">
          /
        </kbd>
      )}
    </div>
  );
}
