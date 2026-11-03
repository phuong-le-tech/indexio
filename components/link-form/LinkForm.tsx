"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [panelMaxHeight, setPanelMaxHeight] = useState<number>();

  const canSubmit = isValidUrl(url) && !loading;

  const measurePanel = useCallback(() => {
    const bottom = formRef.current?.getBoundingClientRect().bottom ?? 0;
    setPanelMaxHeight(Math.max(0, Math.min(window.innerHeight * 0.6, window.innerHeight - bottom - 16)));
  }, []);

  useEffect(() => {
    if (!expanded) return;
    window.addEventListener("resize", measurePanel);
    return () => window.removeEventListener("resize", measurePanel);
  }, [expanded, measurePanel]);

  useEffect(() => {
    function handleOutsideClick(event: PointerEvent) {
      if (!formRef.current?.contains(event.target as Node) && url.trim() === "") {
        setExpanded(false);
        setSelectedTags([]);
        setNotes("");
        setError(null);
      }
    }
    document.addEventListener("pointerdown", handleOutsideClick);
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
  }, [url]);

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
        setExpanded(true);
        setError(body.error || "Failed to add link");
        return;
      }
    } catch {
      setExpanded(true);
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
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).blur();
      setExpanded(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onKeyDownCapture={handleKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) collapse();
      }}
      className={`relative h-[58px] rounded-[var(--radius-sm)] border bg-[var(--color-surface)] transition-[border-color,box-shadow] focus-within:ring-[3px] focus-within:ring-[var(--color-focus)] ${
        error
          ? "border-[var(--color-danger)]"
          : "border-[var(--color-line-strong)] focus-within:border-[var(--color-accent)]"
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
          onFocus={() => { measurePanel(); setExpanded(true); }}
          placeholder="Paste a URL to save"
          className="h-full min-w-0 flex-1 bg-transparent text-[length:var(--text-base)] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)] disabled:opacity-60"
        />
        {expanded && (
          <div style={{ maxHeight: panelMaxHeight }} className="absolute inset-x-0 top-full z-30 flex max-h-[60dvh] flex-col gap-2 overflow-auto rounded-b-[var(--radius-sm)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-4 py-3 shadow-lg sm:px-5">
            {error && (
              <p role="alert" className="flex items-center gap-1.5 text-[length:var(--text-xs)] text-[var(--color-danger)]">
                <AlertIcon size={14} className="shrink-0" />
                {error}
              </p>
            )}
            <TagPicker availableTags={availableTags} selected={selectedTags} onChange={setSelectedTags} />
            <textarea
              aria-label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="w-full shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-inset)] px-3 py-1.5 text-[length:var(--text-sm)] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-accent)]"
            />
            <p className="flex shrink-0 items-center gap-1.5 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
              <Kbd>⏎</Kbd> to save <Kbd>esc</Kbd> to close
            </p>
          </div>
        )}
        {savedFlash ? (
          <span role="status" className="flex shrink-0 items-center gap-1.5 px-2 text-[length:var(--text-sm)] font-medium text-[var(--color-accent)]">
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
    </form>
  );
}
