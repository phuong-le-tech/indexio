"use client";

import { useRef, useState } from "react";
import { XIcon } from "@/components/ui/Icon";
import { getTagColor } from "@/lib/tagColors";

interface TagPickerProps {
  availableTags: string[];
  selected: string[];
  onChange: (tags: string[]) => void;
}

export function TagPicker({ availableTags, selected, onChange }: TagPickerProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = availableTags.filter((tag) => {
    const isSelected = selected.some((s) => s.toLowerCase() === tag.toLowerCase());
    if (isSelected) return false;
    if (input.trim() === "") return true;
    return tag.toLowerCase().includes(input.trim().toLowerCase());
  });

  function addTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const alreadySelected = selected.some((s) => s.toLowerCase() === trimmed.toLowerCase());
    if (!alreadySelected) {
      onChange([...selected, trimmed]);
    }
    setInput("");
    setHighlight(0);
  }

  function removeTag(name: string) {
    onChange(selected.filter((t) => t !== name));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && suggestions.length > 0) {
        addTag(suggestions[highlight]);
      } else if (input.trim()) {
        addTag(input);
      }
      return;
    }
    if (e.key === ",") {
      e.preventDefault();
      if (input.trim()) addTag(input);
      return;
    }
    if (e.key === "Backspace" && input === "" && selected.length > 0) {
      removeTag(selected[selected.length - 1]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(suggestions.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div className="relative">
      <div className="flex w-full flex-wrap items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-2 py-1.5 focus-within:border-[var(--color-accent)] focus-within:ring-[3px] focus-within:ring-[var(--color-focus)]">
        {selected.map((tag) => {
          const color = getTagColor(tag);
          return (
            <span
              key={tag}
              style={{ background: color.bg, borderColor: color.border, color: color.text }}
              className="flex items-center gap-1 rounded-[var(--radius-full)] border py-0.5 pr-1 pl-2 text-[length:var(--text-2xs)] font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`Remove ${tag}`}
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/10"
              >
                <XIcon size={9} />
              </button>
            </span>
          );
        })}
        <input
          aria-label="Add tags"
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 100)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? "Add tags" : ""}
          className="min-h-11 min-w-[6rem] flex-1 bg-transparent text-[length:var(--text-sm)] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 z-10 mt-1 max-h-40 w-full min-w-[10rem] overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-surface-raised)] py-1 shadow-md">
          {suggestions.map((tag, i) => {
            const color = getTagColor(tag);
            return (
              <li key={tag}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTag(tag)}
                  onMouseEnter={() => setHighlight(i)}
                  style={i === highlight ? { background: color.bg, color: color.text } : undefined}
                  className={`min-h-11 w-full px-3 py-1.5 text-left text-[length:var(--text-sm)] ${
                    i === highlight ? "" : "text-[var(--color-ink-2)]"
                  }`}
                >
                  {tag}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
