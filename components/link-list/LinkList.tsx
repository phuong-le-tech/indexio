"use client";

import { useState } from "react";
import { LinkIcon, PencilIcon, TrashIcon } from "@/components/ui/Icon";
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
      <ul className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {links.map((link) => (
          <LinkCard
            key={link.id}
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
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="rounded-[var(--radius-md)] border border-[var(--color-hairline)] px-4 py-2 text-[var(--text-sm)] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)] disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}

interface LinkCardProps {
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
      className={`group relative flex gap-4 rounded-[var(--radius-lg)] border p-5 transition-all duration-150 ${
        editing ? "h-auto" : "h-60 overflow-hidden"
      } ${
        selected
          ? "border-[var(--color-accent)] bg-[var(--color-accent-bg)]"
          : "border-[var(--color-hairline)] bg-[var(--color-surface)]"
      } ${
        deleting
          ? "scale-[0.98] opacity-40"
          : selected
            ? ""
            : "hover:border-[var(--color-line)] hover:bg-[var(--color-surface-hover)] focus-within:border-[var(--color-accent)] focus-within:ring-[3px] focus-within:ring-[var(--color-accent)]/20"
      }`}
    >
      {selectionMode ? (
        <button
          type="button"
          onClick={onToggleSelect}
          aria-label={selected ? `Deselect ${displayTitle}` : `Select ${displayTitle}`}
          aria-pressed={selected}
          className="absolute inset-0 z-0 rounded-[var(--radius-lg)]"
        />
      ) : (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={displayTitle}
          className="absolute inset-0 z-0 rounded-[var(--radius-lg)]"
        />
      )}

      <div
        className={`pointer-events-none relative z-[1] flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border ${
          selectionMode && selected
            ? "border-[var(--color-accent)] bg-[var(--color-accent-solid)]"
            : "border-[var(--color-hairline)] bg-[var(--color-inset)]"
        }`}
      >
        {selectionMode ? (
          selected && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-inverse)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )
        ) : link.favicon_url && !faviconFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={link.favicon_url}
            alt=""
            width={12}
            height={12}
            className="rounded-[2px]"
            onError={() => setFaviconFailed(true)}
          />
        ) : (
          <LinkIcon size={11} className="text-[var(--color-ink-3)]" />
        )}
      </div>

      <div className="pointer-events-none relative z-[1] flex min-w-0 flex-1 flex-col">
        <p
          className={`line-clamp-2 leading-snug break-words ${
            link.title
              ? "text-[var(--text-lg)] font-semibold text-[var(--color-ink)]"
              : "font-mono text-[var(--text-base)] text-[var(--color-ink)]"
          }`}
        >
          {displayTitle}
        </p>

        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[var(--text-xs)] text-[var(--color-ink-3)]">
          <span className="min-w-0 truncate">{host}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{relativeTime(link.created_at)}</span>
          {broken && (
            <span className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-danger-bg)] px-1.5 py-0.5 text-[var(--text-2xs)] text-[var(--color-danger)]">
              unreachable
            </span>
          )}
        </p>

        {link.description && (
          <p className="mt-2 line-clamp-2 text-[var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
            {link.description}
          </p>
        )}

        {link.notes && !editing && (
          <p className="mt-2 line-clamp-2 border-l-2 border-[var(--color-accent-line)] py-0.5 pl-3 text-[var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
            {link.notes}
          </p>
        )}

        {editing ? (
          <EditFields link={link} onSaved={onSaved} onCancel={onCancelEdit} />
        ) : (
          link.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 overflow-hidden">
              {link.tags.map((tag) => {
                const color = getTagColor(tag);
                return (
                  <span
                    key={tag}
                    style={{ background: color.bg, color: color.text }}
                    className="rounded-[var(--radius-sm)] px-2 py-0.5 text-[var(--text-2xs)]"
                  >
                    {tag}
                  </span>
                );
              })}
            </div>
          )
        )}
      </div>

      {!editing && !selectionMode && (
        <div className="card-actions pointer-events-none absolute top-3 right-3 z-[2] flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit"
            className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-3)] hover:bg-[var(--color-inset)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-accent)]/20"
          >
            <PencilIcon size={15} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete"
            className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-accent)]/20"
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
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes"
        rows={2}
        className="w-full rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-page)] px-3 py-1.5 text-[var(--text-sm)] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
      />
      <input
        type="text"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="tags, comma, separated"
        className="w-full rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-page)] px-3 py-1.5 text-[var(--text-xs)] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-[var(--radius-sm)] bg-[var(--color-accent-solid)] px-3 py-1.5 text-[var(--text-xs)] font-medium text-[var(--color-inverse)] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[var(--radius-sm)] border border-[var(--color-hairline)] px-3 py-1.5 text-[var(--text-xs)] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-hover)]"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-[var(--text-xs)] text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
