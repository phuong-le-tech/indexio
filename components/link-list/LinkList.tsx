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

    const res = await fetch(`/api/links/${id}`, { method: "DELETE" });

    if (!res.ok) {
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
      <ul className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
      className={`group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border shadow-sm transition-[transform,box-shadow,border-color,background-color,opacity] duration-200 has-[:focus-visible]:border-[var(--color-accent)] has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-[var(--color-focus)] ${
        selected
          ? "border-[var(--color-accent)] bg-[var(--color-accent-bg)]"
          : "border-[var(--color-hairline)] bg-[var(--color-surface)]"
      } ${
        deleting
          ? "scale-[0.98] opacity-40"
          : selected
            ? ""
            : "hover:-translate-y-0.5 hover:border-[var(--color-line)] hover:shadow-md"
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

      <div className="pointer-events-none relative z-[1]">
        <LinkThumbnail imageUrl={link.image_url} faviconUrl={link.favicon_url} host={host} />
        {selectionMode && (
          <span
            className={`absolute top-3 left-3 flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] border shadow-sm ${
              selected
                ? "border-[var(--color-accent)] bg-[var(--color-accent-solid)] text-[var(--color-inverse)]"
                : "border-[var(--color-line-strong)] bg-[var(--color-surface)]"
            }`}
          >
            {selected && <CheckIcon size={14} />}
          </span>
        )}
      </div>

      <div className="pointer-events-none relative z-[1] flex min-w-0 flex-1 flex-col p-4">
        <p className="flex items-center gap-2 font-mono text-[var(--text-xs)] text-[var(--color-ink-3)]">
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
            <span className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-danger-bg)] px-1.5 py-0.5 text-[var(--text-2xs)] text-[var(--color-danger)]">
              unreachable
            </span>
          )}
        </p>

        <p
          className={`mt-2 line-clamp-2 leading-snug break-words ${
            link.title
              ? "text-[var(--text-lg)] font-semibold text-[var(--color-ink)]"
              : "font-mono text-[var(--text-base)] text-[var(--color-ink)]"
          }`}
        >
          {displayTitle}
        </p>

        {link.description && (
          <p className="mt-1.5 line-clamp-2 text-[var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
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
            <div className="mt-auto flex flex-wrap gap-1.5 overflow-hidden pt-3">
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
            className={`pointer-events-auto flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-raised)] text-[var(--color-ink-2)] shadow-sm hover:text-[var(--color-ink)] ${FOCUS_RING}`}
          >
            <PencilIcon size={15} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete"
            className={`pointer-events-auto flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-raised)] text-[var(--color-danger)] shadow-sm hover:bg-[var(--color-danger-bg)] ${FOCUS_RING}`}
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

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/links/${link.id}`, {
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
        className="w-full rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-inset)] px-3 py-1.5 text-[var(--text-sm)] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
      />
      <input
        type="text"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="tags, comma, separated"
        className="w-full rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-inset)] px-3 py-1.5 text-[var(--text-xs)] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
      />
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
