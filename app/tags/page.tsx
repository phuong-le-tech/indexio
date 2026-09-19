"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getTagColor } from "@/lib/tagColors";
import type { Tag } from "@/lib/types";

const CONFIRM_TIMEOUT_MS = 3000;

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadTags() {
    const res = await fetch("/api/tags");
    const data = await res.json();
    setTags(data.tags || []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    loadTags();
  }, []);

  return (
    <div className="mx-auto w-full max-w-[var(--container-col)] px-5 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[var(--text-xl)] text-[var(--color-ink)]">Manage tags</h1>
        <Link
          href="/"
          className="text-[var(--text-sm)] text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
        >
          Back to index
        </Link>
      </div>

      {loading ? (
        <p className="text-[var(--text-sm)] text-[var(--color-ink-3)]">Loading…</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tags.map((tag) => (
            <TagRow key={tag.id} tag={tag} allTags={tags} onChanged={loadTags} />
          ))}
        </ul>
      )}
    </div>
  );
}

interface TagRowProps {
  tag: Tag;
  allTags: Tag[];
  onChanged: () => void;
}

function TagRow({ tag, allTags, onChanged }: TagRowProps) {
  const color = getTagColor(tag.name);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [error, setError] = useState<string | null>(null);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [mergeTarget, setMergeTarget] = useState("");
  const [mergeArmed, setMergeArmed] = useState(false);

  async function handleRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === tag.name) {
      setEditing(false);
      setName(tag.name);
      return;
    }
    const res = await fetch(`/api/tags/${tag.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Failed to rename tag");
      return;
    }
    setEditing(false);
    setError(null);
    onChanged();
  }

  function handleDeleteClick() {
    if (!deleteArmed) {
      setDeleteArmed(true);
      setTimeout(() => setDeleteArmed(false), CONFIRM_TIMEOUT_MS);
      return;
    }
    fetch(`/api/tags/${tag.id}`, { method: "DELETE" }).then(onChanged);
  }

  function handleMergeClick() {
    if (!mergeTarget) return;
    if (!mergeArmed) {
      setMergeArmed(true);
      setTimeout(() => setMergeArmed(false), CONFIRM_TIMEOUT_MS);
      return;
    }
    fetch("/api/tags/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromId: tag.id, intoId: Number(mergeTarget) }),
    }).then(onChanged);
  }

  const otherTags = allTags.filter((t) => t.id !== tag.id);

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-4 py-3">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: color.text }}
        aria-hidden="true"
      />

      {editing ? (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") {
              setEditing(false);
              setName(tag.name);
            }
          }}
          autoFocus
          className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--color-accent)] bg-[var(--color-page)] px-2 py-1 text-[var(--text-sm)] text-[var(--color-ink)] outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex-1 text-left text-[var(--text-sm)] text-[var(--color-ink)] hover:underline"
        >
          {tag.name}
        </button>
      )}

      <span className="font-mono text-[var(--text-2xs)] text-[var(--color-ink-3)]">
        {tag.link_count} link{tag.link_count === 1 ? "" : "s"}
      </span>

      {otherTags.length > 0 && (
        <div className="flex items-center gap-1.5">
          <select
            value={mergeTarget}
            onChange={(e) => {
              setMergeTarget(e.target.value);
              setMergeArmed(false);
            }}
            className="rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-page)] px-1.5 py-1 text-[var(--text-2xs)] text-[var(--color-ink-2)] outline-none"
          >
            <option value="">Merge into…</option>
            {otherTags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {mergeTarget && (
            <button
              type="button"
              onClick={handleMergeClick}
              className={`rounded-[var(--radius-sm)] px-2 py-1 text-[var(--text-2xs)] font-medium ${
                mergeArmed
                  ? "bg-[var(--color-accent-solid)] text-[var(--color-inverse)]"
                  : "border border-[var(--color-hairline)] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              {mergeArmed ? "Confirm?" : "Merge"}
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleDeleteClick}
        className={`rounded-[var(--radius-sm)] px-2 py-1 text-[var(--text-2xs)] font-medium ${
          deleteArmed
            ? "bg-[var(--color-danger)] text-[var(--color-inverse)]"
            : "text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
        }`}
      >
        {deleteArmed ? "Confirm?" : "Delete"}
      </button>

      {error && (
        <p className="w-full text-[var(--text-2xs)] text-[var(--color-danger)]">{error}</p>
      )}
    </li>
  );
}
