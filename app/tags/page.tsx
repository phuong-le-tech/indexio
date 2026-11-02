"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TagIcon } from "@/components/ui/Icon";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Menu } from "@/components/ui/Menu";
import { FOCUS_RING } from "@/components/ui/styles";
import { TAG_COLOR_FAMILIES, getFamilyColor, getTagColor, isTagColorFamily, setTagColorOverrides } from "@/lib/tagColors";
import type { Tag } from "@/lib/types";

const INPUT_CLASS = `min-h-10 min-w-0 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-inset)] px-3 text-[length:var(--text-sm)] text-[var(--color-ink)] ${FOCUS_RING}`;

type TagAction = { type: "delete" | "merge"; tag: Tag };

async function sendTagRequest(url: string, init: RequestInit, fallbackError: string) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(typeof body?.error === "string" ? body.error : fallbackError);
  }
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState<TagAction | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");
  const [mergeConfirmed, setMergeConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const requestPending = useRef(false);

  async function loadTags() {
    try {
      const res = await fetch("/api/tags");
      if (!res.ok) throw new Error(`GET /api/tags failed with ${res.status}`);
      const data = await res.json();
      const fetched: Tag[] = data.tags || [];
      setTagColorOverrides(fetched);
      setTags(fetched);
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

  function openAction(type: TagAction["type"], tag: Tag) {
    setError(null);
    setMergeTarget("");
    setMergeConfirmed(false);
    setAction({ type, tag });
  }

  const target = tags.find((tag) => String(tag.id) === mergeTarget && tag.id !== action?.tag.id);

  async function confirmAction() {
    if (!action || requestPending.current) return;
    if (action.type === "merge") {
      if (!target) return;
      if (!mergeConfirmed) {
        setMergeConfirmed(true);
        return;
      }
    }
    requestPending.current = true;
    setBusy(true);
    setError(null);
    try {
      if (action.type === "delete") {
        await sendTagRequest(`/api/tags/${action.tag.id}`, { method: "DELETE" }, "Failed to delete tag");
      } else {
        await sendTagRequest("/api/tags/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromId: action.tag.id, intoId: target!.id }),
        }, "Failed to merge tags");
      }
      // Remove the source locally too, so a failed refresh cannot offer the destructive action again.
      setTags((current) => current.filter((tag) => tag.id !== action.tag.id));
      await loadTags();
      setAction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes. Try again.");
    } finally {
      requestPending.current = false;
      setBusy(false);
    }
  }

  const filteredTags = tags.filter((tag) => tag.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <main className="mx-auto w-full max-w-[var(--container-col)] px-5 py-8 sm:px-8 sm:py-12">
      <div className="mb-10 flex items-center justify-between gap-3 border-b border-[var(--color-line)] pb-6">
        <span className="font-display text-3xl">Indexio<span className="text-[var(--color-accent)]">.</span></span>
        <Link href="/" className={buttonClasses({ variant: "secondary", size: "sm" })}>Back to index</Link>
      </div>
      <p className="eyebrow mb-3">Organize your collection</p>
      <h1 className="font-display text-5xl sm:text-6xl">The tag index</h1>
      <p className="mt-3 mb-8 max-w-lg text-sm text-[var(--color-ink-2)]">Small labels. Useful connections. Rename, recolor or bring related tags together.</p>

      <label htmlFor="tag-search" className="mb-2 block text-[length:var(--text-sm)] font-medium">Search tags</label>
      <input ref={searchRef} id="tag-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name" className={`${INPUT_CLASS} mb-4 w-full`} />
      {loadFailed && (
        <div role="alert" className="mb-4 text-[length:var(--text-sm)] text-[var(--color-danger)]">
          <p>Could not refresh tags. The list may be out of date.</p>
          <Button size="sm" className="mt-2" onClick={() => void loadTags()} disabled={busy}>Retry</Button>
        </div>
      )}
      {loading ? <p role="status" className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">Loading...</p> : tags.length === 0 && !loadFailed ? (
        <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line)] px-5 py-14 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-accent-bg)] text-[var(--color-accent)]"><TagIcon size={24} /></span>
          <p className="text-[length:var(--text-base)] font-semibold text-[var(--color-ink)]">No tags yet</p>
          <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">Tags you add to links will show up here.</p>
          <Link href="/" className={buttonClasses({ variant: "primary", className: "mt-5" })}>Back to your links</Link>
        </div>
      ) : (
        <>
          <p role="status" className="mb-3 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">{filteredTags.length} of {tags.length} tags</p>
          {filteredTags.length === 0 && tags.length > 0 && <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">No tags match your search.</p>}
          <ul aria-label="Tags" className="flex flex-col gap-2">
            {filteredTags.map((tag) => <TagRow key={tag.id} tag={tag} onChanged={loadTags} onAction={(type) => openAction(type, tag)} canMerge={tags.length > 1} restoreFallback={() => searchRef.current?.focus()} />)}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={action !== null}
        title={action?.type === "delete" ? "Delete tag?" : mergeConfirmed ? "Confirm tag merge" : "Merge tag"}
        description={action?.type === "delete" ? (
          <p>Delete &quot;{action.tag.name}&quot; from {action.tag.link_count} link{action.tag.link_count === 1 ? "" : "s"}? The links themselves will not be deleted. This cannot be undone.</p>
        ) : action && mergeConfirmed && target ? (
          <p>Merge &quot;{action.tag.name}&quot; into &quot;{target.name}&quot;? This affects {action.tag.link_count} link{action.tag.link_count === 1 ? "" : "s"} currently tagged &quot;{action.tag.name}&quot; and removes the source tag. Links already tagged &quot;{target.name}&quot; keep that tag. This cannot be undone.</p>
        ) : <p>Choose the tag that will replace &quot;{action?.tag.name}&quot; on {action?.tag.link_count} link{action?.tag.link_count === 1 ? "" : "s"}. You will review the merge before saving.</p>}
        confirmLabel={action?.type === "delete" ? "Delete tag" : mergeConfirmed ? "Confirm merge" : "Review merge"}
        danger={action?.type === "delete" || mergeConfirmed}
        busy={busy}
        error={error}
        disabled={action?.type === "merge" && !target}
        onConfirm={() => void confirmAction()}
        onCancel={() => { if (!requestPending.current) setAction(null); }}
        fallbackFocusRef={searchRef}
      >
        {action?.type === "merge" && !mergeConfirmed && (
          <>
            <label htmlFor="merge-target" className="mb-2 block text-[length:var(--text-sm)] font-medium">Merge into</label>
            <select id="merge-target" value={mergeTarget} onChange={(event) => setMergeTarget(event.target.value)} className={`${INPUT_CLASS} w-full`}>
              <option value="">Choose a target tag</option>
              {tags.filter((tag) => tag.id !== action.tag.id).map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
            </select>
          </>
        )}
      </ConfirmDialog>
    </main>
  );
}

interface TagRowProps {
  tag: Tag;
  onChanged: () => Promise<void>;
  onAction: (type: TagAction["type"]) => void;
  canMerge: boolean;
  restoreFallback: () => void;
}

function TagRow({ tag, onChanged, onAction, canMerge, restoreFallback }: TagRowProps) {
  const [editing, setEditing] = useState<"name" | "color" | null>(null);
  const [name, setName] = useState(tag.name);
  const [draftColor, setDraftColor] = useState(tag.color ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rowRef = useRef<HTMLLIElement>(null);
  const requestPending = useRef(false);
  const color = editing === "color" && isTagColorFamily(draftColor) ? getFamilyColor(draftColor) : getTagColor(tag.name);

  function restoreFocus() {
    requestAnimationFrame(() => {
      const trigger = rowRef.current?.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]');
      if (trigger) trigger.focus();
      else restoreFallback();
    });
  }

  function startEditing(mode: "name" | "color") {
    setName(tag.name);
    setDraftColor(tag.color ?? "");
    setError(null);
    setEditing(mode);
  }

  function cancelEditing() {
    if (requestPending.current) return;
    setEditing(null);
    setError(null);
    restoreFocus();
  }

  async function save() {
    if (requestPending.current) return;
    if (editing === "name" && !name.trim()) {
      setError("Enter a tag name.");
      return;
    }
    requestPending.current = true;
    setBusy(true);
    setError(null);
    try {
      await sendTagRequest(`/api/tags/${tag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing === "name" ? { name: name.trim() } : { color: draftColor || null }),
      }, editing === "name" ? "Failed to rename tag" : "Failed to update tag colour");
      await onChanged();
      setEditing(null);
      restoreFocus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes. Try again.");
    } finally {
      requestPending.current = false;
      setBusy(false);
    }
  }

  return (
    <li ref={rowRef} aria-busy={busy} className="flex min-w-0 flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-4 py-3 shadow-sm">
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color.text }} aria-hidden="true" />
      <span className="min-w-0 flex-1 break-words text-[length:var(--text-sm)] font-medium text-[var(--color-ink)]">{tag.name}</span>
      <span className="shrink-0 font-mono text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">{tag.link_count} link{tag.link_count === 1 ? "" : "s"}</span>
      <Menu label={`Actions for ${tag.name}`} trigger={<span aria-hidden="true">...</span>} items={[
        { label: "Rename", disabled: busy, onSelect: () => startEditing("name") },
        { label: "Change colour", disabled: busy, onSelect: () => startEditing("color") },
        { label: "Merge into...", disabled: busy || !canMerge, onSelect: () => { setEditing(null); onAction("merge"); } },
        { label: "Delete", disabled: busy, danger: true, onSelect: () => { setEditing(null); onAction("delete"); } },
      ]} />
      {editing && (
        <form className="flex w-full min-w-0 flex-wrap items-end gap-2 border-t border-[var(--color-hairline)] pt-3" onSubmit={(event) => { event.preventDefault(); void save(); }} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); cancelEditing(); } }}>
          <div className="flex min-w-0 flex-1 basis-40 flex-col gap-2 text-[length:var(--text-xs)] font-medium">
            <label htmlFor={`tag-${editing}-${tag.id}`}>{editing === "name" ? "Tag name" : "Tag colour"}</label>
            {editing === "name" ? (
              <input id={`tag-name-${tag.id}`} autoFocus value={name} onChange={(event) => setName(event.target.value)} disabled={busy} aria-invalid={!!error} aria-describedby={error ? `tag-error-${tag.id}` : undefined} className={INPUT_CLASS} />
            ) : (
              <select id={`tag-color-${tag.id}`} autoFocus value={draftColor} onChange={(event) => setDraftColor(event.target.value)} disabled={busy} className={INPUT_CLASS}>
                <option value="">Automatic</option>
                {TAG_COLOR_FAMILIES.map((family) => <option key={family} value={family}>{family[0].toUpperCase() + family.slice(1)}</option>)}
              </select>
            )}
          </div>
          <Button type="submit" variant="primary" disabled={busy || (editing === "name" && !name.trim())}>{busy ? "Saving..." : "Save"}</Button>
          <Button onClick={cancelEditing} disabled={busy}>Cancel</Button>
        </form>
      )}
      {error && <p id={`tag-error-${tag.id}`} role="alert" className="w-full text-[length:var(--text-xs)] text-[var(--color-danger)]">{error}</p>}
    </li>
  );
}
