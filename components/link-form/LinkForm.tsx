"use client";

import { useRef, useState } from "react";
import { LinkIcon } from "@/components/ui/Icon";
import { TagPicker } from "@/components/ui/TagPicker";

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

    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        notes: notes || undefined,
        tags: selectedTags,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Failed to add link");
      return;
    }

    setUrl("");
    setSelectedTags([]);
    setNotes("");
    setExpanded(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
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
      className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-[var(--color-inset)] p-1"
    >
      <div className="flex h-11 items-center gap-3 pr-2 pl-4">
        <LinkIcon size={15} className="shrink-0 text-[var(--color-ink-3)]" />
        <input
          ref={inputRef}
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onFocus={() => setExpanded(true)}
          onBlur={collapse}
          placeholder="Paste a URL to save"
          className="min-w-0 flex-1 bg-transparent text-[var(--text-sm)] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]"
        />
        {savedFlash ? (
          <span className="shrink-0 text-[var(--text-xs)] font-medium text-[var(--color-accent)]">
            Saved
          </span>
        ) : (
          <button
            type="submit"
            disabled={!canSubmit}
            className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-accent-solid)] px-3 py-1.5 text-[var(--text-xs)] font-medium text-[var(--color-inverse)] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loading ? "Adding…" : "Add link"}
          </button>
        )}
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 px-4 pb-3">
          <TagPicker availableTags={availableTags} selected={selectedTags} onChange={setSelectedTags} />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-1.5 text-[var(--text-xs)] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-accent)]"
          />
          {error && <p className="text-[var(--text-xs)] text-[var(--color-danger)]">{error}</p>}
          <p className="text-[var(--text-2xs)] text-[var(--color-ink-3)]">⏎ to save · esc to close</p>
        </div>
      )}
    </form>
  );
}
