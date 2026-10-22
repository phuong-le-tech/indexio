"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { AlertIcon, CheckIcon, LinkIcon, SpinnerIcon } from "@/components/ui/Icon";
import { Kbd } from "@/components/ui/Kbd";
import { TagPicker } from "@/components/ui/TagPicker";

const SAVED_FLASH_MS = 2000;

interface LinkFormProps {
  onCreated: () => void;
  availableTags: string[];
  inputRef?: React.Ref<HTMLInputElement>;
}

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function LinkForm({ onCreated, availableTags, inputRef }: LinkFormProps) {
  const [url, setUrl] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const canSubmit = isValidUrl(url) && !loading;

  function collapse() {
    if (url.trim() === "") {
      setExpanded(false);
      setSelectedTags([]);
      setNotes("");
      setError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          notes: notes || undefined,
          tags: selectedTags,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Failed to add link");
        return;
      }
    } catch {
      setError("Failed to add link");
      return;
    } finally {
      setLoading(false);
    }

    setUrl("");
    setSelectedTags([]);
    setNotes("");
    setExpanded(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), SAVED_FLASH_MS);
    onCreated();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      (e.target as HTMLElement).blur();
      collapse();
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className={`rounded-[var(--radius-lg)] border bg-[var(--color-surface)] shadow-md transition-[border-color,box-shadow] focus-within:ring-[3px] focus-within:ring-[var(--color-focus)] ${
        error
          ? "border-[var(--color-danger)]"
          : "border-[var(--color-line)] focus-within:border-[var(--color-accent)]"
      }`}
    >
      <div className="flex h-14 items-center gap-3 pr-2.5 pl-4 sm:pl-5">
        <LinkIcon size={18} className="shrink-0 text-[var(--color-accent)]" />
        <input
          ref={inputRef}
          type="url"
          required
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          aria-label="URL to save"
          aria-invalid={error ? true : undefined}
          disabled={loading}
          onFocus={() => setExpanded(true)}
          onBlur={collapse}
          placeholder="Paste a URL to save"
          className="min-w-0 flex-1 bg-transparent text-[var(--text-base)] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)] disabled:opacity-60"
        />
        {savedFlash ? (
          <span
            role="status"
            className="flex shrink-0 items-center gap-1.5 px-2 text-[var(--text-sm)] font-medium text-[var(--color-accent)]"
          >
            <CheckIcon size={16} />
            Saved
          </span>
        ) : (
          <Button type="submit" variant="primary" disabled={!canSubmit}>
            {loading && <SpinnerIcon size={14} />}
            {loading ? "Adding…" : "Add link"}
          </Button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-center gap-1.5 px-4 pb-3 text-[var(--text-xs)] text-[var(--color-danger)] sm:px-5"
        >
          <AlertIcon size={14} className="shrink-0" />
          {error}
        </p>
      )}

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-[var(--color-hairline)] px-4 pt-3 pb-3 sm:px-5">
          <TagPicker availableTags={availableTags} selected={selectedTags} onChange={setSelectedTags} />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-inset)] px-3 py-1.5 text-[var(--text-sm)] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-accent)]"
          />
          <p className="flex items-center gap-1.5 text-[var(--text-2xs)] text-[var(--color-ink-3)]">
            <Kbd>⏎</Kbd> to save <Kbd>esc</Kbd> to close
          </p>
        </div>
      )}
    </form>
  );
}
