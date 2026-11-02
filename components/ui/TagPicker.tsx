"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CheckIcon, XIcon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/components/ui/styles";

interface TagPickerProps {
  // Callers supply tags in usage order from GET /api/tags.
  availableTags: string[];
  selected: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  above?: boolean;
}

export function TagPicker({ availableTags, selected, onChange, disabled = false, above = false }: TagPickerProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const names = [...new Set([...availableTags, ...selected])];
  const query = input.trim();
  const suggestions = names.filter((tag) => tag.toLowerCase().includes(query.toLowerCase()));
  const canCreate = query !== "" && !names.some((tag) => tag.toLowerCase() === query.toLowerCase());
  const options = canCreate ? [query, ...suggestions] : suggestions;
  const activeIndex = Math.min(highlight, Math.max(options.length - 1, 0));

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, listId]);

  function toggle(name: string) {
    const existing = selected.find((tag) => tag.toLowerCase() === name.toLowerCase());
    onChange(existing ? selected.filter((tag) => tag !== existing) : [...selected, name]);
  }

  function choose(index: number) {
    const name = options[index];
    if (!name || disabled) return;
    toggle(name);
    if (canCreate && index === 0) {
      setInput("");
      setHighlight(0);
    }
    inputRef.current?.focus();
  }

  return (
    <div className="relative min-w-0" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <div className="flex min-w-0 flex-wrap items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] p-2 focus-within:ring-[3px] focus-within:ring-[var(--color-focus)]">
        {selected.map((tag) => (
          <span key={tag} className="flex max-w-full min-w-0 items-center rounded border border-[var(--color-accent-line)] bg-[var(--color-accent-bg)] pl-2 text-xs text-[var(--color-accent)]">
            <span className="truncate">{tag}</span>
            <button type="button" disabled={disabled} aria-label={`Remove ${tag}`} onClick={() => onChange(selected.filter((name) => name !== tag))} className={`flex h-10 w-10 shrink-0 items-center justify-center ${FOCUS_RING}`}><XIcon size={12} /></button>
          </span>
        ))}
        <input ref={inputRef} role="combobox" aria-label="Add tags" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-activedescendant={open && options.length ? `${listId}-${activeIndex}` : undefined} autoComplete="off" disabled={disabled} value={input} onChange={(event) => { setInput(event.target.value); setOpen(true); setHighlight(0); }} onFocus={() => setOpen(true)} placeholder="Find or create tags" className="min-h-10 w-full min-w-0 flex-1 basis-32 bg-transparent text-sm text-[var(--color-ink)] outline-none" onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setHighlight(open ? (activeIndex + (event.key === "ArrowDown" ? 1 : -1) + options.length) % Math.max(options.length, 1) : 0);
          }
          if (event.key === "Enter") { event.preventDefault(); if (open) choose(activeIndex); else setOpen(true); }
          if (event.key === "Backspace" && !input && selected.length) onChange(selected.slice(0, -1));
        }} />
      </div>
      {open && !disabled && (
        <ul id={listId} role="listbox" aria-label="Tag suggestions" aria-multiselectable="true" className={`absolute inset-x-0 z-30 max-h-60 overflow-auto rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-raised)] p-1 shadow-lg ${above ? "bottom-full mb-1" : "top-full mt-1"}`}>
          {options.map((tag, index) => {
            const checked = selected.some((name) => name.toLowerCase() === tag.toLowerCase());
            const create = canCreate && index === 0;
            return <li key={`${tag}-${index}`} id={`${listId}-${index}`} role="option" aria-selected={checked} onPointerDown={(event) => event.preventDefault()} onClick={() => choose(index)} onPointerMove={() => setHighlight(index)} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded px-2 text-sm [overflow-wrap:anywhere] ${index === activeIndex ? "bg-[var(--color-accent-bg)] text-[var(--color-accent)]" : "text-[var(--color-ink)]"}`}>
              <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-current">{checked && <CheckIcon size={12} />}</span>
              <span>{create ? `Create '${tag}'` : tag}</span>
            </li>;
          })}
          {options.length === 0 && <li role="presentation" className="p-3 text-sm text-[var(--color-ink-2)]">Type a name to create your first tag.</li>}
        </ul>
      )}
    </div>
  );
}
