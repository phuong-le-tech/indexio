"use client";

import { useState } from "react";
import { LinkIcon, PencilIcon, TrashIcon } from "@/components/ui/Icon";
import { hostname, relativeTime } from "@/lib/format";
import { getTagColor } from "@/lib/tagColors";
import type { Link } from "@/lib/types";

interface LinkListProps {
  links: Link[];
  onDeleted: () => void;
}

export function LinkList({ links, onDeleted }: LinkListProps) {
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
    <ul className="flex flex-col gap-4">
      {links.map((link) => (
        <LinkCard
          key={link.id}
          link={link}
          deleting={deletingIds.has(link.id)}
          editing={editingId === link.id}
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
  );
}

interface LinkCardProps {
  link: Link;
  deleting: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaved: () => void;
  onDelete: () => void;
}

function LinkCard({ link, deleting, editing, onEdit, onCancelEdit, onSaved, onDelete }: LinkCardProps) {
  const host = hostname(link.url);
  const displayTitle = link.title || `${host}${new URL(link.url).pathname}`;

  return (
    <li
      className={`group relative flex gap-4 rounded-[var(--radius-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 transition-all duration-150 ${
        deleting
          ? "scale-[0.98] opacity-40"
          : "hover:border-[var(--color-line)] hover:bg-[var(--color-surface-hover)] focus-within:border-[var(--color-accent)] focus-within:ring-[3px] focus-within:ring-[var(--color-accent)]/20"
      }`}
    >
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={displayTitle}
        className="absolute inset-0 z-0 rounded-[var(--radius-lg)]"
      />

      <div className="pointer-events-none relative z-[1] flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-inset)]">
        {link.favicon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={link.favicon_url} alt="" width={12} height={12} className="rounded-[2px]" />
        ) : (
          <LinkIcon size={11} className="text-[var(--color-ink-3)]" />
        )}
      </div>

      <div className="pointer-events-none relative z-[1] min-w-0 flex-1">
        <p
          className={`leading-snug break-words ${
            link.title
              ? "text-[var(--text-lg)] font-semibold text-[var(--color-ink)]"
              : "font-mono text-[var(--text-base)] text-[var(--color-ink)]"
          }`}
        >
          {displayTitle}
        </p>

        <p className="mt-1 flex items-center gap-2 font-mono text-[var(--text-xs)] text-[var(--color-ink-3)]">
          <span>{host}</span>
          <span aria-hidden="true">·</span>
          <span>{relativeTime(link.created_at)}</span>
        </p>

        {link.description && (
          <p className="mt-2 line-clamp-2 text-[var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
            {link.description}
          </p>
        )}

        {link.notes && !editing && (
          <p className="mt-2 border-l-2 border-[var(--color-accent-line)] py-0.5 pl-3 text-[var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
            {link.notes}
          </p>
        )}

        {editing ? (
          <EditFields link={link} onSaved={onSaved} onCancel={onCancelEdit} />
        ) : (
          link.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
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

      {!editing && (
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
    </div>
  );
}
