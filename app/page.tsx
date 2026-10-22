"use client";

import NavLink from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LinkForm } from "@/components/link-form/LinkForm";
import { LinkList } from "@/components/link-list/LinkList";
import { LinkListSkeleton } from "@/components/link-list/LinkListSkeleton";
import { SearchBar } from "@/components/ui/SearchBar";
import { ShortcutsHelp } from "@/components/ui/ShortcutsHelp";
import { TagFilter } from "@/components/ui/TagFilter";
import { setTagColorOverrides } from "@/lib/tagColors";
import type { Link, Tag } from "@/lib/types";

const SKELETON_DELAY_MS = 200;

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [links, setLinks] = useState<Link[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [activeTag, setActiveTag] = useState<string | null>(searchParams.get("tag"));
  const [sort, setSort] = useState(searchParams.get("sort") || "created_desc");
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [totalLinks, setTotalLinks] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkTagInput, setBulkTagInput] = useState("");
  const [bulkDeleteArmed, setBulkDeleteArmed] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [brokenIds, setBrokenIds] = useState<Set<number>>(new Set());
  const [checkingLinks, setCheckingLinks] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [linksLoadFailed, setLinksLoadFailed] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const loadLinks = useCallback(
    async (offset = 0) => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (activeTag) params.set("tag", activeTag);
      if (sort !== "created_desc") params.set("sort", sort);
      if (offset) params.set("offset", String(offset));

      try {
        const res = await fetch(`/api/links?${params.toString()}`);
        if (!res.ok) throw new Error(`GET /api/links failed with ${res.status}`);
        const data = await res.json();
        const fetched: Link[] = data.links || [];
        const count = data.matchCount ?? 0;

        setLinks((prev) => (offset ? [...prev, ...fetched] : fetched));
        setMatchCount(count);
        if (!query && !activeTag) {
          setTotalLinks(count);
        }
        setHasMore(Boolean(data.hasMore));
        setLinksLoadFailed(false);
      } catch {
        setLinksLoadFailed(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query, activeTag, sort]
  );

  async function handleLoadMore() {
    setLoadingMore(true);
    await loadLinks(links.length);
  }

  const loadTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (!res.ok) throw new Error(`GET /api/tags failed with ${res.status}`);
      const data = await res.json();
      const fetched: Tag[] = data.tags || [];
      setTags(fetched);
      setTagColorOverrides(fetched);
    } catch {
      // Tag chips are secondary: keep the last known tags rather than blocking the page.
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount/query change
    void loadLinks();
  }, [loadLinks]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    void loadTags();
  }, [loadTags]);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setShowSkeleton(true), SKELETON_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setShowSkeleton(false);
    };
  }, [loading]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (activeTag) params.set("tag", activeTag);
      if (sort !== "created_desc") params.set("sort", sort);
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
      setLoading(true);
      void loadLinks();
    }, 120);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeTag, sort]);

  function handleChanged() {
    void loadLinks();
    void loadTags();
  }

  function toggleSelectionMode() {
    setSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
    setBulkTagInput("");
    setBulkDeleteArmed(false);
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // Resolves to false (and shows a message) instead of rejecting; busy flag always resets.
  async function runBulkAction(payload: object, failureMessage: string): Promise<boolean> {
    setBulkBusy(true);
    setImportMessage(null);
    try {
      const res = await fetch("/api/links/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) return true;
      const body = await res.json().catch(() => ({}));
      setImportMessage(body.error || failureMessage);
    } catch {
      setImportMessage(failureMessage);
    } finally {
      setBulkBusy(false);
    }
    return false;
  }

  async function handleBulkDelete() {
    if (!bulkDeleteArmed) {
      setBulkDeleteArmed(true);
      setTimeout(() => setBulkDeleteArmed(false), 3000);
      return;
    }
    const ok = await runBulkAction(
      { ids: Array.from(selectedIds), action: "delete" },
      "Failed to delete links"
    );
    setBulkDeleteArmed(false);
    if (!ok) return;
    toggleSelectionMode();
    handleChanged();
  }

  async function handleBulkAddTag() {
    const tag = bulkTagInput.trim();
    if (!tag || selectedIds.size === 0) return;
    const ok = await runBulkAction(
      { ids: Array.from(selectedIds), action: "add_tag", tag },
      "Failed to add tag"
    );
    if (!ok) return;
    setBulkTagInput("");
    handleChanged();
  }

  async function handleCheckLinks() {
    setCheckingLinks(true);
    setImportMessage(null);
    try {
      const res = await fetch("/api/links/check", { method: "POST" });
      if (!res.ok) throw new Error(`POST /api/links/check failed with ${res.status}`);
      const data = await res.json();
      const broken = new Set<number>(
        (data.results || []).filter((r: { ok: boolean }) => !r.ok).map((r: { id: number }) => r.id)
      );
      setBrokenIds(broken);
    } catch {
      setImportMessage("Could not check links");
    } finally {
      setCheckingLinks(false);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const format = file.name.toLowerCase().endsWith(".csv") ? "csv" : "json";

    setImporting(true);
    setImportMessage(null);
    try {
      const content = await file.text();
      const res = await fetch("/api/links/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, content }),
      });
      const data = await res.json();

      if (!res.ok) {
        setImportMessage(data.error || "Import failed");
        return;
      }

      setImportMessage(
        `Imported ${data.imported} link${data.imported === 1 ? "" : "s"}${data.skipped ? `, skipped ${data.skipped}` : ""}`
      );
      handleChanged();
      setTimeout(() => setImportMessage(null), 5000);
    } catch {
      setImportMessage("Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth", { method: "DELETE" });
      if (!res.ok) throw new Error(`DELETE /api/auth failed with ${res.status}`);
    } catch {
      setImportMessage("Could not log out");
      return;
    }
    router.push("/login");
    router.refresh();
  }

  const hasFilter = query !== "" || activeTag !== null;
  const isEmpty = !loading && !linksLoadFailed && links.length === 0 && !hasFilter;
  const isNoResults = !loading && !linksLoadFailed && links.length === 0 && hasFilter;

  return (
    <div className="mx-auto w-full max-w-[var(--container-wide)] px-5 py-12">
      <div className="mx-auto w-full max-w-[var(--container-col)]">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[var(--text-xl)] text-[var(--color-ink)]">Indexio</h1>
        <div className="flex items-center gap-4">
          <ShortcutsHelp />
          <button
            type="button"
            onClick={toggleSelectionMode}
            className="text-[var(--text-sm)] text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
          >
            {selectionMode ? "Cancel" : "Select"}
          </button>
          <button
            type="button"
            onClick={handleCheckLinks}
            disabled={checkingLinks}
            className="text-[var(--text-sm)] text-[var(--color-ink-3)] hover:text-[var(--color-ink)] disabled:opacity-50"
          >
            {checkingLinks ? "Checking…" : "Check links"}
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download from an API route, not a page; next/link would intercept it */}
          <a
            href="/api/links/export"
            className="text-[var(--text-sm)] text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
          >
            Export
          </a>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,.csv,application/json,text/csv"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            className="text-[var(--text-sm)] text-[var(--color-ink-3)] hover:text-[var(--color-ink)] disabled:opacity-50"
          >
            {importing ? "Importing…" : "Import"}
          </button>
          <NavLink
            href="/tags"
            className="text-[var(--text-sm)] text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
          >
            Manage tags
          </NavLink>
          <button
            onClick={handleLogout}
            className="text-[var(--text-sm)] text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
          >
            Log out
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3">
        <SearchBar
          value={query}
          onChange={setQuery}
          totalCount={totalLinks}
          resultCount={matchCount}
        />
        <LinkForm onCreated={handleChanged} availableTags={tags.map((t) => t.name)} />
      </div>

      {selectionMode && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-inset)] px-3 py-2">
          <span className="text-[var(--text-xs)] text-[var(--color-ink-2)]">
            {selectedIds.size} selected
          </span>
          <input
            type="text"
            value={bulkTagInput}
            onChange={(e) => setBulkTagInput(e.target.value)}
            placeholder="Add tag to selected…"
            disabled={selectedIds.size === 0 || bulkBusy}
            className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-2 py-1 text-[var(--text-xs)] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleBulkAddTag}
            disabled={!bulkTagInput.trim() || selectedIds.size === 0 || bulkBusy}
            className="rounded-[var(--radius-sm)] border border-[var(--color-hairline)] px-2 py-1 text-[var(--text-xs)] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
          >
            Add tag
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0 || bulkBusy}
            className={`rounded-[var(--radius-sm)] px-2 py-1 text-[var(--text-xs)] font-medium disabled:opacity-50 ${
              bulkDeleteArmed
                ? "bg-[var(--color-danger)] text-[var(--color-inverse)]"
                : "text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
            }`}
          >
            {bulkDeleteArmed ? "Confirm?" : "Delete"}
          </button>
        </div>
      )}
      <div className="mb-4 flex justify-end">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort links"
          className="rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-2 py-1 text-[var(--text-xs)] text-[var(--color-ink-2)] outline-none focus:border-[var(--color-accent)]"
        >
          <option value="created_desc">Newest</option>
          <option value="created_asc">Oldest</option>
          <option value="title_asc">Title A–Z</option>
        </select>
      </div>

      {tags.length > 0 && (
        <div className="mb-4">
          <TagFilter tags={tags} activeTag={activeTag} onSelect={setActiveTag} totalCount={totalLinks} />
        </div>
      )}
      </div>

      {loading && showSkeleton && <LinkListSkeleton />}

      {isEmpty && (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line)] px-5 py-12 text-center">
          <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">Nothing saved yet.</p>
          <p className="mt-1 text-[var(--text-xs)] text-[var(--color-ink-3)]">
            Paste a URL above to add your first link.
          </p>
        </div>
      )}

      {isNoResults && (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line)] px-5 py-12 text-center">
          <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">No matches.</p>
          <p className="mt-1 text-[var(--text-xs)] text-[var(--color-ink-3)]">
            Try a different search or clear the active tag.
          </p>
        </div>
      )}

      {linksLoadFailed && (
        <p className="mb-3 text-[var(--text-xs)] text-[var(--color-danger)]">Could not load links.</p>
      )}

      {importMessage && (
        <p className="mb-3 text-[var(--text-xs)] text-[var(--color-ink-2)]">{importMessage}</p>
      )}

      {brokenIds.size > 0 && (
        <p className="mb-3 text-[var(--text-xs)] text-[var(--color-danger)]">
          {brokenIds.size} link{brokenIds.size === 1 ? "" : "s"} unreachable — flagged below.
        </p>
      )}

      {!loading && links.length > 0 && (
        <LinkList
          links={links}
          onDeleted={handleChanged}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={handleLoadMore}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          brokenIds={brokenIds}
        />
      )}
    </div>
  );
}
