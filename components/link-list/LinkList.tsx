"use client";

import { useState } from "react";
import { LinkThumbnail } from "@/components/link-list/LinkThumbnail";
import { Button } from "@/components/ui/Button";
import { CheckIcon, LinkIcon, PencilIcon, TrashIcon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/components/ui/styles";
import { hostname, relativeTime } from "@/lib/format";
import { getTagColor } from "@/lib/tagColors";
import type { Link } from "@/lib/types";

interface LinkListProps {
  links: Link[];
  onDeleted: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  selectionMode?: boolean;
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
  brokenIds?: Set<number>;
}

export function LinkList({
  links,
  onDeleted,
  hasMore,
  loadingMore,
  onLoadMore,
  selectionMode,
  selectedIds,
  onToggleSelect,
  brokenIds,
}: LinkListProps) {
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);

  async function handleDelete(id: number) {
    setDeletingIds((prev) => new Set(prev).add(id));

    let deleted = false;
    try {
      const res = await fetch(`/api/links/${id}`, { method: "DELETE" });
      deleted = res.ok;
    } catch {
      // Network failure: fall through and un-mark the card as deleting.
    }

    if (!deleted) {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }

    onDeleted();
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <>
      <ul aria-label="Saved links" className="border-t border-[var(--color-line-strong)]">
        {links.map((link, index) => (
          <LinkCard
            key={link.id}
            index={index + 1}
            link={link}
            deleting={deletingIds.has(link.id)}
            editing={!selectionMode && editingId === link.id}
            selectionMode={Boolean(selectionMode)}
            selected={selectedIds?.has(link.id) ?? false}
            onToggleSelect={() => onToggleSelect?.(link.id)}
            broken={brokenIds?.has(link.id) ?? false}
            onEdit={() => setEditingId(link.id)}
            onCancelEdit={() => setEditingId(null)}
            onSaved={() => {
              setEditingId(null);
              onDeleted();
            }}
            onDelete={() => handleDelete(link.id)}
          />
        ))}
      </ul>
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </>
  );
}

interface LinkCardProps {
  index: number;
  link: Link;
  deleting: boolean;
  editing: boolean;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  broken: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaved: () => void;
  onDelete: () => void;
}

function LinkCard({
  index,
  link,
  deleting,
  editing,
  selectionMode,
  selected,
  onToggleSelect,
  broken,
  onEdit,
  onCancelEdit,
  onSaved,
  onDelete,
}: LinkCardProps) {
  const host = hostname(link.url);
  const displayTitle = link.title || `${host}${new URL(link.url).pathname}`;
  const [faviconFailed, setFaviconFailed] = useState(false);

  return (
    <li
      className={`group relative flex gap-3 border-b px-1 py-6 transition-[background-color,opacity] duration-200 sm:gap-6 sm:px-3 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-[var(--color-focus)] ${
        selected
          ? "border-[var(--color-accent)] bg-[var(--color-accent-bg)]"
          : "border-[var(--color-line)] bg-transparent"
      } ${
        deleting
          ? "scale-[0.98] opacity-40"
          : selected
            ? ""
            : "hover:bg-[var(--color-surface)]"
      }`}
    >
      {selectionMode ? (
        <button
          type="button"
          onClick={onToggleSelect}
          aria-label={selected ? `Deselect ${displayTitle}` : `Select ${displayTitle}`}
          aria-pressed={selected}
          className="absolute inset-0 z-0 rounded-[var(--radius-lg)] focus-visible:outline-none"
        />
      ) : (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={displayTitle}
          className="absolute inset-0 z-0 rounded-[var(--radius-lg)] focus-visible:outline-none"
        />
      )}

      <div className="pointer-events-none relative z-[1] w-7 shrink-0 pt-1 font-mono text-[length:var(--text-xs)] text-[var(--color-ink-3)] sm:w-10">
        {String(index).padStart(2, "0")}
        {selectionMode && (
          <span
            className={`absolute top-9 left-0 flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] border ${
              selected
                ? "border-[var(--color-accent)] bg-[var(--color-accent-solid)] text-[var(--color-inverse)]"
                : "border-[var(--color-line-strong)] bg-[var(--color-surface)]"
            }`}
          >
            {selected && <CheckIcon size={14} />}
          </span>
        )}
      </div>

      <div className="pointer-events-none relative z-[1] flex min-w-0 flex-1 flex-col">
        <p className="flex flex-wrap items-center gap-2 font-mono text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
          {link.favicon_url && !faviconFailed ? (
            // eslint-disable-next-line @next/next/no-img-element -- tiny remote favicon
            <img
              src={link.favicon_url}
              alt=""
              width={14}
              height={14}
              referrerPolicy="no-referrer"
              className="shrink-0 rounded-[2px]"
              onError={() => setFaviconFailed(true)}
            />
          ) : (
            <LinkIcon size={13} className="shrink-0" />
          )}
          <span className="min-w-0 truncate">{host}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{relativeTime(link.created_at)}</span>
          {broken && (
            <span className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-danger-bg)] px-1.5 py-0.5 text-[length:var(--text-2xs)] text-[var(--color-danger)]">
              unreachable
            </span>
          )}
        </p>

        <p
          className={`mt-2 line-clamp-2 leading-snug break-words ${
            link.title
              ? "font-display text-2xl text-[var(--color-ink)] sm:text-[1.75rem]"
              : "font-mono text-[length:var(--text-base)] text-[var(--color-ink)]"
          }`}
        >
          {displayTitle}
        </p>

        {link.description && (
          <p className="mt-1.5 line-clamp-2 text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
            {link.description}
          </p>
        )}

        {link.notes && !editing && (
          <p className="mt-2 line-clamp-2 text-[length:var(--text-sm)] italic leading-relaxed text-[var(--color-ink-2)]">
            {link.notes}
          </p>
        )}

        {editing ? (
          <EditFields link={link} onSaved={onSaved} onCancel={onCancelEdit} />
        ) : (
          link.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 overflow-hidden pt-3">
              {link.tags.map((tag) => {
                const color = getTagColor(tag);
                return (
                  <span
                    key={tag}
                    className="flex max-w-full items-center gap-1.5 break-words text-[length:var(--text-xs)] text-[var(--color-ink-2)]"
                  >
                    <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color.text }} />
                    {tag}
                  </span>
                );
              })}
            </div>
          )
        )}
      </div>

      {link.image_url && !editing && (
        <div className="pointer-events-none relative z-[1] hidden w-32 shrink-0 self-center overflow-hidden rounded-[var(--radius-sm)] md:block">
          <LinkThumbnail imageUrl={link.image_url} faviconUrl={link.favicon_url} host={host} />
        </div>
      )}

      {!editing && !selectionMode && (
        <div className="card-actions pointer-events-none relative z-[2] flex shrink-0 flex-col items-center gap-2 sm:flex-row sm:self-start">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit"
            className={`pointer-events-auto flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-2)] hover:bg-[var(--color-inset)] hover:text-[var(--color-ink)] ${FOCUS_RING}`}
          >
            <PencilIcon size={15} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete"
            className={`pointer-events-auto flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-3)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] ${FOCUS_RING}`}
          >
            <TrashIcon size={15} />
          </button>
        </div>
      )}
    </li>
  );
}

interface EditFieldsProps {
  link: Link;
  onSaved: () => void;
  onCancel: () => void;
}

function EditFields({ link, onSaved, onCancel }: EditFieldsProps) {
  const [notes, setNotes] = useState(link.notes || "");
  const [tags, setTags] = useState(link.tags.join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error(`PATCH /api/links/${link.id} failed with ${res.status}`);
    } catch {
      setError("Failed to save changes");
      setSaving(false);
      return;
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="pointer-events-auto relative z-[1] mt-3 flex flex-col gap-2">
      <textarea
        aria-label="Link notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes"
        rows={2}
        className="w-full rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-inset)] px-3 py-1.5 text-[length:var(--text-sm)] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
      />
      <input
        aria-label="Link tags"
        type="text"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="tags, comma, separated"
        className="min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-inset)] px-3 py-1.5 text-[length:var(--text-base)] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
      />
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {error && <p className="text-[length:var(--text-xs)] text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
