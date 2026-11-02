"use client";

import { useEffect, useRef, useState } from "react";
import { SearchIcon, XIcon } from "@/components/ui/Icon";
import { Kbd } from "@/components/ui/Kbd";
import { FOCUS_RING } from "@/components/ui/styles";

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
      className={`flex h-14 items-center gap-3 rounded-[var(--radius-sm)] border bg-[var(--color-surface)] px-4 transition-[border-color,box-shadow] sm:px-5 ${
        focused
          ? "border-[var(--color-accent)] ring-[3px] ring-[var(--color-focus)]"
          : "border-[var(--color-line-strong)] hover:border-[var(--color-accent)]"
      }`}
    >
      <SearchIcon
        size={20}
        className={`shrink-0 transition-colors ${focused ? "text-[var(--color-accent)]" : "text-[var(--color-ink-2)]"}`}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label="Search links"
        placeholder={`Search ${totalCount} link${totalCount === 1 ? "" : "s"}`}
        className="h-full min-w-0 flex-1 bg-transparent text-[length:var(--text-base)] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
      />
      {showResult && (
        <div className="flex shrink-0 items-center gap-2">
          <span
            role="status"
            className="font-mono text-[length:var(--text-xs)] text-[var(--color-ink-3)]"
          >
            {resultCount} result{resultCount === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-3)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)] ${FOCUS_RING}`}
          >
            <XIcon size={14} />
          </button>
        </div>
      )}
      {showHint && <Kbd>/</Kbd>}
    </div>
  );
}
