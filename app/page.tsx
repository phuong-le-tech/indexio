"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LinkForm } from "@/components/link-form/LinkForm";
import { BulkBar } from "@/components/link-list/BulkBar";
import { LinkList } from "@/components/link-list/LinkList";
import { LinkListSkeleton } from "@/components/link-list/LinkListSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
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
  const addInputRef = useRef<HTMLInputElement | null>(null);

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
      showToast(broken.size === 0 ? "All links are reachable." : `${broken.size} links unreachable - flagged below.`, broken.size === 0 ? "success" : "error");
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

      showToast(
        `Imported ${data.imported} link${data.imported === 1 ? "" : "s"}${data.skipped ? `, skipped ${data.skipped}` : ""}`, "success"
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
    <main className={`mx-auto w-full max-w-[var(--container-wide)] px-5 py-8 sm:px-8 sm:py-12 ${selectionMode ? "pb-64 sm:pb-32" : ""}`}>
      <div className="mx-auto w-full max-w-[var(--container-col)]">
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
          onChange={setQuery}
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

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          {tags.length > 0 && (
            <TagFilter tags={tags} activeTag={activeTag} onSelect={setActiveTag} totalCount={totalLinks} />
          )}
        </div>
        <SortSelect value={sort} onChange={setSort} />
      </div>

      {loading && showSkeleton && <LinkListSkeleton />}

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
            setQuery("");
            setActiveTag(null);
          }}
        />

      )}

      {linksLoadFailed && (
        <EmptyState
          icon={<ActivityIcon size={24} />}
          title="Could not load your library"
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

      {!loading && !linksLoadFailed && links.length > 0 && (
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
    </main>
    {selectionMode && (
      <BulkBar
        selectedCount={selectedIds.size}
        tagInput={bulkTagInput}
        onTagInputChange={setBulkTagInput}
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
