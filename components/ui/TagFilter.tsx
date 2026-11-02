"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FOCUS_RING } from "@/components/ui/styles";
import { trapDialogFocus } from "@/components/ui/dialog";
import { getTagColor } from "@/lib/tagColors";
import type { Tag } from "@/lib/types";

interface TagFilterProps {
  tags: Tag[];
  activeTag: string | null;
  onSelect: (tag: string | null) => void;
  totalCount: number;
}

const VISIBLE_TAGS = 8;

export function TagFilter({ tags, activeTag, onSelect, totalCount }: TagFilterProps) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = triggerRef.current;
    dialog.showModal();
    const desktop = matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      dialog.close();
      if (trigger && !desktop.matches) trigger.focus();
    };
  }, [open]);
  const matching = [...tags]
    .sort((a, b) => b.link_count - a.link_count || a.name.localeCompare(b.name))
    .filter((tag) => tag.name.toLowerCase().includes(query.trim().toLowerCase()));
  const visible = showAll || query ? matching : matching.slice(0, VISIBLE_TAGS);

  const panel = (
      <div>
        <p className="eyebrow mb-3 hidden lg:block">Filter by tag</p>
        <input type="search" aria-label="Search filter tags" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a tag" className="mb-2 min-h-11 w-full min-w-0 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-page)] px-3 text-sm" />
        <button type="button" aria-pressed={activeTag === null} onClick={() => onSelect(null)} className={`flex min-h-11 w-full items-center justify-between gap-2 rounded px-2 text-sm ${activeTag === null ? "bg-[var(--color-accent-bg)] text-[var(--color-accent)]" : "text-[var(--color-ink-2)]"} ${FOCUS_RING}`}>
          All links <span className="font-mono text-xs">{totalCount}</span>
        </button>
        <ul aria-label="Filter tags">
          {visible.map((tag) => (
            <li key={tag.id}>
              <button type="button" aria-pressed={activeTag === tag.name} onClick={() => onSelect(activeTag === tag.name ? null : tag.name)} className={`flex min-h-11 w-full min-w-0 items-center gap-2 rounded px-2 text-left text-sm ${activeTag === tag.name ? "bg-[var(--color-accent-bg)] text-[var(--color-accent)]" : "text-[var(--color-ink-2)] hover:bg-[var(--color-inset)]"} ${FOCUS_RING}`}>
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: getTagColor(tag.name).text }} />
                <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                <span className="shrink-0 font-mono text-xs">{tag.link_count}</span>
              </button>
            </li>
          ))}
        </ul>
        {matching.length === 0 && <p className="py-3 text-sm text-[var(--color-ink-2)]">No matching tags.</p>}
        {!query && matching.length > VISIBLE_TAGS && <button type="button" onClick={() => setShowAll(!showAll)} className={`min-h-11 w-full px-2 text-left text-sm underline ${FOCUS_RING}`}>{showAll ? "Show less" : `Show more (${matching.length - VISIBLE_TAGS})`}</button>}
      </div>
  );

  return (
    <aside aria-label="Filter by tag" className="min-w-0 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] p-3 lg:self-start">
      <button ref={triggerRef} type="button" aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? panelId : undefined} onClick={() => setOpen(true)} className={`min-h-11 w-full text-left font-medium lg:hidden ${FOCUS_RING}`}>
        Filter by tag{activeTag ? " (1 active)" : ""} <span aria-hidden="true">+</span>
      </button>
      {open ? (
        <dialog ref={dialogRef} id={panelId} aria-labelledby={titleId} onKeyDown={trapDialogFocus} onCancel={(event) => { event.preventDefault(); setOpen(false); }} className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 text-[var(--color-ink)] backdrop:bg-[var(--color-scrim)]">
          <h2 id={titleId} className="mb-4 font-display text-3xl">Filter by tag</h2>
          {panel}
          <button type="button" onClick={() => setOpen(false)} className={`mt-4 min-h-11 w-full rounded bg-[var(--color-accent-solid)] px-3 text-sm text-[var(--color-inverse)] ${FOCUS_RING}`}>Show results</button>
        </dialog>
      ) : <div className="hidden lg:block">{panel}</div>}
    </aside>
  );
}
