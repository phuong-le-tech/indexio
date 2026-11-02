"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TagIcon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button, buttonClasses } from "@/components/ui/Button";
import { FOCUS_RING } from "@/components/ui/styles";
import { TAG_COLOR_FAMILIES, getFamilyColor, getTagColor, setTagColorOverrides } from "@/lib/tagColors";
import type { Tag } from "@/lib/types";

const CONFIRM_TIMEOUT_MS = 3000;

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  async function loadTags() {
    try {
      const res = await fetch("/api/tags");
      if (!res.ok) throw new Error(`GET /api/tags failed with ${res.status}`);
      const data = await res.json();
      const fetched: Tag[] = data.tags || [];
      setTags(fetched);
      setTagColorOverrides(fetched);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    void loadTags();
  }, []);

  function renderTagList() {
    if (loading) {
      return <p role="status" className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">Loading…</p>;
    }
    if (loadFailed) {
      return <EmptyState icon={<TagIcon size={24} />} title="Could not load tags" description="Your collection is still here. Try connecting again." actionLabel="Retry" onAction={() => void loadTags()} />;
    }
    if (tags.length === 0) {
      return (
        <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line)] px-5 py-14 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-accent-bg)] text-[var(--color-accent)]">
            <TagIcon size={24} />
          </span>
          <p className="text-[length:var(--text-base)] font-semibold text-[var(--color-ink)]">No tags yet</p>
          <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            Tags you add to links will show up here.
          </p>
          <Link href="/" className={buttonClasses({ variant: "primary", className: "mt-5" })}>
            Back to your links
          </Link>
        </div>
      );
    }
    return (
      <ul aria-label="Tags" className="flex flex-col border-t border-[var(--color-line-strong)]">
        {tags.map((tag) => (
          <TagRow key={tag.id} tag={tag} allTags={tags} onChanged={loadTags} />
        ))}
      </ul>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[var(--container-col)] px-5 py-8 sm:px-8 sm:py-12">
      <div className="mb-10 flex items-center justify-between gap-3 border-b border-[var(--color-line)] pb-6">
        <span className="font-display text-3xl">Indexio<span className="text-[var(--color-accent)]">.</span></span>
        <Link href="/" className={buttonClasses({ variant: "secondary", size: "sm" })}>
          Back to index
        </Link>
      </div>

      <p className="eyebrow mb-3">Organize your collection</p>
      <h1 className="font-display text-5xl sm:text-6xl">The tag index</h1>
      <p className="mt-3 mb-8 max-w-lg text-[length:var(--text-sm)] text-[var(--color-ink-2)]">Small labels. Useful connections. Rename, recolor or bring related tags together.</p>
      {renderTagList()}
    </main>
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
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  async function handleRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === tag.name) {
      setEditing(false);
      setName(tag.name);
      return;
    }
    const ok = await sendTagRequest(
      `/api/tags/${tag.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      },
      "Failed to rename tag",
    );
    if (!ok) return;
    setEditing(false);
    onChanged();
  }

  // Resolves to false (and shows the row error) instead of rejecting, so callers never leak a rejection.
  async function sendTagRequest(url: string, init: RequestInit, fallbackError: string): Promise<boolean> {
    try {
      const res = await fetch(url, init);
      if (res.ok) {
        setError(null);
        return true;
      }
      const body = await res.json().catch(() => ({}));
      setError(body.error || fallbackError);
    } catch {
      setError(fallbackError);
    }
    return false;
  }

  async function handleDeleteClick() {
    if (!deleteArmed) {
      setDeleteArmed(true);
      setTimeout(() => setDeleteArmed(false), CONFIRM_TIMEOUT_MS);
      return;
    }
    setDeleteArmed(false);
    const ok = await sendTagRequest(`/api/tags/${tag.id}`, { method: "DELETE" }, "Failed to delete tag");
    if (ok) onChanged();
  }

  async function handleMergeClick() {
    if (!mergeTarget) return;
    if (!mergeArmed) {
      setMergeArmed(true);
      setTimeout(() => setMergeArmed(false), CONFIRM_TIMEOUT_MS);
      return;
    }
    setMergeArmed(false);
    const ok = await sendTagRequest(
      "/api/tags/merge",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromId: tag.id, intoId: Number(mergeTarget) }),
      },
      "Failed to merge tags",
    );
    if (ok) onChanged();
  }

  async function handlePickColor(family: string) {
    const nextColor = tag.color === family ? null : family;
    setColorPickerOpen(false);
    const ok = await sendTagRequest(
      `/api/tags/${tag.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: nextColor }),
      },
      "Failed to update tag color",
    );
    if (ok) onChanged();
  }

  const otherTags = allTags.filter((t) => t.id !== tag.id);

  return (
    <li className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--color-line)] px-1 py-5 transition-colors hover:bg-[var(--color-surface)] sm:flex sm:flex-wrap sm:px-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => setColorPickerOpen((prev) => !prev)}
          aria-label="Change tag color"
          className={`flex h-11 w-11 items-center justify-center rounded-full hover:ring-2 hover:ring-[var(--color-line)] ${FOCUS_RING}`}
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: color.text }}
            aria-hidden="true"
          />
        </button>
        {colorPickerOpen && (
          <div className="absolute top-full left-0 z-10 mt-1 grid w-44 grid-cols-3 gap-2 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-raised)] p-2 shadow-lg">
            {TAG_COLOR_FAMILIES.map((family) => {
              const swatch = getFamilyColor(family);
              const isActive = tag.color === family;
              return (
                <button
                  key={family}
                  type="button"
                  onClick={() => handlePickColor(family)}
                  aria-label={family}
                  title={family}
                  className={`h-11 w-11 rounded-full border-[12px] border-[var(--color-surface-raised)] ${FOCUS_RING} ${isActive ? "ring-2 ring-[var(--color-accent)] ring-offset-1 ring-offset-[var(--color-surface-raised)]" : ""}`}
                  style={{ background: swatch.text }}
                />
              );
            })}
          </div>
        )}
      </div>

      {editing ? (
        <input
          aria-label="Tag name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleRename();
            if (e.key === "Escape") {
              setEditing(false);
              setName(tag.name);
            }
          }}
          autoFocus
          className={`min-h-11 min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--color-accent)] bg-[var(--color-inset)] px-2 py-1 text-[length:var(--text-base)] text-[var(--color-ink)] outline-none ${FOCUS_RING}`}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`min-h-11 min-w-0 flex-1 break-words rounded-[var(--radius-sm)] text-left text-[length:var(--text-base)] text-[var(--color-ink)] hover:underline ${FOCUS_RING}`}
        >
          {tag.name}
        </button>
      )}

      <span className="font-mono text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
        {tag.link_count} link{tag.link_count === 1 ? "" : "s"}
      </span>

      {otherTags.length > 0 && (
        <div className="col-span-2 col-start-1 flex min-w-0 max-w-full items-center gap-1.5">
          <select
            aria-label={`Merge ${tag.name} into`}
            value={mergeTarget}
            onChange={(e) => {
              setMergeTarget(e.target.value);
              setMergeArmed(false);
            }}
            className={`h-11 min-w-0 max-w-40 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] px-2 text-[length:var(--text-xs)] text-[var(--color-ink-2)] outline-none ${FOCUS_RING}`}
          >
            <option value="">Merge into…</option>
            {otherTags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {mergeTarget && (
            <Button
              variant={mergeArmed ? "primary" : "secondary"}
              size="sm"
              onClick={handleMergeClick}
            >
              {mergeArmed ? "Confirm?" : "Merge"}
            </Button>
          )}
        </div>
      )}

      <Button
        variant={deleteArmed ? "dangerSolid" : "danger"}
        size="sm"
        className="col-start-3"
        onClick={handleDeleteClick}
      >
        {deleteArmed ? "Confirm?" : "Delete"}
      </Button>

      {error && (
        <p className="w-full text-[length:var(--text-2xs)] text-[var(--color-danger)]">{error}</p>
      )}
    </li>
  );
}
