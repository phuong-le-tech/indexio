"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LinkForm } from "@/components/link-form/LinkForm";
import { BulkBar } from "@/components/link-list/BulkBar";
import { LinkList } from "@/components/link-list/LinkList";
import { LinkListSkeleton } from "@/components/link-list/LinkListSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { SearchBar } from "@/components/ui/SearchBar";
import { AppHeader } from "@/components/ui/AppHeader";
import {
  ActivityIcon,
  DownloadIcon,
  InboxIcon,
  LogOutIcon,
  SearchIcon,
  SelectIcon,
  TagIcon,
  UploadIcon,
} from "@/components/ui/Icon";
import type { MenuItem } from "@/components/ui/Menu";
import { SortSelect } from "@/components/ui/SortSelect";
import { TagFilter } from "@/components/ui/TagFilter";
import { useToast } from "@/components/ui/Toast";
import { setTagColorOverrides } from "@/lib/tagColors";
import { PAGE_SIZE, clampPage, totalPages } from "@/lib/pagination";
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
  const showToast = useToast();

  const [links, setLinks] = useState<Link[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [activeTag, setActiveTag] = useState<string | null>(searchParams.get("tag"));
  const [sort, setSort] = useState(searchParams.get("sort") || "created_desc");
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [totalLinks, setTotalLinks] = useState(0);
  const [page, setPage] = useState(() => {
    const value = Number(searchParams.get("page"));
    return Number.isSafeInteger(value) && value > 0 ? value : 1;
  });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkTags, setBulkTags] = useState<string[]>([]);
  const [bulkDeleteArmed, setBulkDeleteArmed] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [brokenIds, setBrokenIds] = useState<Set<number>>(new Set());
  const [checkingLinks, setCheckingLinks] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [linksLoadFailed, setLinksLoadFailed] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const addInputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLElement | null>(null);
  const requestIdRef = useRef<symbol | null>(null);

  const loadLinks = useCallback(async () => {
    const requestId = Symbol();
    requestIdRef.current = requestId;
    setLoading(true);
    setLinksLoadFailed(false);
    let clamping = false;
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (activeTag) params.set("tag", activeTag);
    if (sort !== "created_desc") params.set("sort", sort);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String((page - 1) * PAGE_SIZE));

    try {
      const res = await fetch(`/api/links?${params.toString()}`);
      if (!res.ok) throw new Error(`GET /api/links failed with ${res.status}`);
      const data = await res.json();
      if (requestId !== requestIdRef.current) return;
      let count = data.matchCount ?? 0;
      // The existing API's window count is zero when an offset returns no rows.
      if (page > 1 && data.links.length === 0) {
        params.set("offset", "0");
        const firstPage = await fetch(`/api/links?${params.toString()}`);
        if (!firstPage.ok) throw new Error(`GET /api/links failed with ${firstPage.status}`);
        count = (await firstPage.json()).matchCount ?? 0;
        if (requestId !== requestIdRef.current) return;
      }
      const validPage = clampPage(page, totalPages(count, PAGE_SIZE));
      if (validPage !== page) {
        clamping = true;
        setPage(validPage);
        return;
      }
      setLinks(data.links || []);
      setMatchCount(count);
      if (!query && !activeTag) setTotalLinks(count);
    } catch {
      if (requestId === requestIdRef.current) setLinksLoadFailed(true);
    } finally {
      if (requestId === requestIdRef.current && !clamping) setLoading(false);
    }
  }, [query, activeTag, sort, page]);

  function changePage(next: number) {
    if (next === page) return;
    setLoading(true);
    setPage(next);
    resultsRef.current?.focus({ preventScroll: true });
    resultsRef.current?.scrollIntoView({ block: "start" });
  }

  function changeQuery(value: string) {
    if (value === query) return;
    setLoading(true);
    setQuery(value);
    setPage(1);
  }

  function changeTag(value: string | null) {
    if (value === activeTag) return;
    setLoading(true);
    setActiveTag(value);
    setPage(1);
  }

  function changeSort(value: string) {
    if (value === sort) return;
    setLoading(true);
    setSort(value);
    setPage(1);
  }

  const loadTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (!res.ok) throw new Error(`GET /api/tags failed with ${res.status}`);
      const data = await res.json();
      const fetched: Tag[] = (data.tags || []).sort((a: Tag, b: Tag) => b.link_count - a.link_count || a.name.localeCompare(b.name));
      setTags(fetched);
      setTagColorOverrides(fetched);
    } catch {
      // Tag chips are secondary: keep the last known tags rather than blocking the page.
    }
  }, []);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (activeTag) params.set("tag", activeTag);
      if (sort !== "created_desc") params.set("sort", sort);
      if (page !== 1) params.set("page", String(page));
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
      void loadLinks();
    }, 120);
    return () => {
      clearTimeout(timer);
      requestIdRef.current = null;
    };
  }, [query, activeTag, sort, page, router, loadLinks]);

  function handleChanged() {
    void loadLinks();
    void loadTags();
  }

  function toggleSelectionMode() {
    setSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
    setBulkTags([]);
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
    if (!bulkTags.length || selectedIds.size === 0 || bulkBusy) return;
    // The existing bulk endpoint accepts one tag; retain failed/unattempted tags for retry.
    for (let index = 0; index < bulkTags.length; index++) {
      const ok = await runBulkAction(
        { ids: Array.from(selectedIds), action: "add_tag", tag: bulkTags[index] },
        "Failed to add tag"
      );
      if (!ok) {
        setBulkTags(bulkTags.slice(index));
        handleChanged();
        return;
      }
    }
    setBulkTags([]);
    setSelectedIds(new Set());
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
      const unreachableMessage = `${broken.size} link${broken.size === 1 ? "" : "s"} unreachable - flagged below.`;
      showToast(broken.size === 0 ? "All links are reachable." : unreachableMessage, broken.size === 0 ? "success" : "error");
    } catch {
      showToast("Could not check links. Try again.", "error");
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
        showToast(data.error || "Import failed", "error");
        return;
      }

      const skippedMessage = data.skipped ? `, skipped ${data.skipped}` : "";
      showToast(
        `Imported ${data.imported} link${data.imported === 1 ? "" : "s"}${skippedMessage}`, "success"
      );
      handleChanged();
    } catch {
      showToast("Import failed", "error");
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

  const menuItems: MenuItem[] = [
    {
      label: selectionMode ? "Cancel selection" : "Select",
      icon: <SelectIcon size={16} />,
      onSelect: toggleSelectionMode,
    },
    {
      label: checkingLinks ? "Checking…" : "Check links",
      icon: <ActivityIcon size={16} />,
      disabled: checkingLinks,
      onSelect: handleCheckLinks,
    },
    {
      label: importing ? "Importing…" : "Import",
      icon: <UploadIcon size={16} />,
      disabled: importing,
      onSelect: () => importInputRef.current?.click(),
    },
    { label: "Export", icon: <DownloadIcon size={16} />, href: "/api/links/export" },
    { label: "Manage tags", icon: <TagIcon size={16} />, onSelect: () => router.push("/tags") },
    { label: "Log out", icon: <LogOutIcon size={16} />, danger: true, onSelect: handleLogout },
  ];

  return (
    <>
      <AppHeader
        totalLinks={totalLinks}
        menuItems={menuItems}
        onAdd={() => addInputRef.current?.focus()}
      />
      <input
        ref={importInputRef}
        type="file"
        accept=".json,.csv,application/json,text/csv"
        onChange={handleImportFile}
        className="hidden"
      />
    <main className={`mx-auto w-full max-w-[var(--container-wide)] px-5 py-8 sm:px-8 sm:py-12 ${selectionMode ? "pb-64 sm:pb-64" : ""}`}>
      <div className="mx-auto w-full min-w-0">
      <div className="mb-8 flex items-end justify-between gap-4 border-b border-[var(--color-line)] pb-6">
        <div>
          <p className="eyebrow mb-3">Your personal catalogue</p>
          <h1 className="font-display text-5xl sm:text-6xl">The library</h1>
          <p className="mt-3 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">Good finds. Kept in good company.</p>
        </div>
        <span className="hidden pb-1 font-mono text-[length:var(--text-xs)] text-[var(--color-ink-3)] sm:block">{String(totalLinks).padStart(2, "0")} saved links</span>
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="min-w-0">
          <p className="eyebrow mb-2">01 / Find</p>
        <SearchBar
          value={query}
          onChange={changeQuery}
          totalCount={totalLinks}
          resultCount={matchCount}
        />
        </div>
        <div className="min-w-0">
          <p className="eyebrow mb-2">02 / Collect</p>
        <LinkForm
          onCreated={handleChanged}
          availableTags={tags.map((t) => t.name)}
          inputRef={addInputRef}
        />
        </div>
      </div>

      <div className="catalogue-layout">
        <TagFilter tags={tags} activeTag={activeTag} onSelect={changeTag} totalCount={totalLinks} />
        <section ref={resultsRef} tabIndex={-1} aria-label="Library results" aria-busy={loading} className="min-w-0 scroll-mt-4 outline-none">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div aria-live="polite" aria-atomic="true" className="min-w-0 text-sm text-[var(--color-ink-2)]">
          {matchCount} result{matchCount === 1 ? "" : "s"}
          {activeTag && <span className="sr-only"> filtered by tag {activeTag}</span>}
        </div>
        <SortSelect value={sort} onChange={changeSort} />
      </div>
      {hasFilter && (
        <div className="mb-4 flex min-w-0 flex-wrap items-center gap-2">
          {activeTag && <button type="button" aria-label={`Remove filter ${activeTag}`} onClick={() => changeTag(null)} className="min-h-11 max-w-full truncate rounded border border-[var(--color-accent-line)] bg-[var(--color-accent-bg)] px-3 text-sm text-[var(--color-accent)]">Tag: {activeTag} ×</button>}
          {query && <button type="button" aria-label="Remove search filter" onClick={() => changeQuery("")} className="min-h-11 max-w-full truncate rounded border border-[var(--color-line)] px-3 text-sm">Search: {query} ×</button>}
          <button type="button" onClick={() => { changeQuery(""); changeTag(null); }} className="min-h-11 px-2 text-sm underline">Clear all</button>
        </div>
      )}

      {loading && showSkeleton && links.length === 0 && <LinkListSkeleton />}

      {isEmpty && (
        <EmptyState
          icon={<InboxIcon size={24} />}
          title="Your library is empty"
          description="Paste a URL in the box above and it will show up here with its title, image and tags."
          actionLabel="Add your first link"
          onAction={() => addInputRef.current?.focus()}
        />
      )}

      {isNoResults && (
        <EmptyState
          icon={<SearchIcon size={24} />}
          title="No matches"
          description="Nothing fits your current search or tag. Try different words or clear the filters."
          actionLabel="Clear filters"
          onAction={() => {
            changeQuery("");
            changeTag(null);
          }}
        />
      )}

      {linksLoadFailed && (
        <EmptyState
          icon={<ActivityIcon size={24} />}
          title="Could not load links."
          description="Your links have not been changed. Check your connection and try again."
          actionLabel="Retry"
          onAction={() => { setLoading(true); void loadLinks(); }}
        />
      )}

      {importMessage && (
        <p className="mb-3 text-[length:var(--text-xs)] text-[var(--color-ink-2)]">{importMessage}</p>
      )}

      {brokenIds.size > 0 && (
        <p className="mb-3 text-[length:var(--text-xs)] text-[var(--color-danger)]">
          {brokenIds.size} link{brokenIds.size === 1 ? "" : "s"} unreachable - flagged below.
        </p>
      )}

      {!linksLoadFailed && links.length > 0 && (
        <LinkList
          links={links}
          availableTags={tags.map((tag) => tag.name)}
          onUpdate={(updated) => setLinks((current) => current.map((link) => link.id === updated.id ? updated : link))}
          onDeleted={handleChanged}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          brokenIds={brokenIds}
        />
      )}
      {!linksLoadFailed && (
        <Pagination page={page} matchCount={matchCount} onPageChange={changePage} loading={loading} />
      )}
        </section>
      </div>
      </div>
    </main>
    {selectionMode && (
      <BulkBar
        selectedCount={selectedIds.size}
        otherPageCount={selectedIds.size - links.filter((link) => selectedIds.has(link.id)).length}
        availableTags={tags.map((tag) => tag.name)}
        tags={bulkTags}
        onTagsChange={setBulkTags}
        onAddTag={handleBulkAddTag}
        deleteArmed={bulkDeleteArmed}
        onDelete={handleBulkDelete}
        onCancel={toggleSelectionMode}
        busy={bulkBusy}
      />
    )}
    </>
  );
}
