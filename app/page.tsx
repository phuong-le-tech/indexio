"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LinkForm } from "@/components/link-form/LinkForm";
import { BulkBar } from "@/components/link-list/BulkBar";
import { LinkList } from "@/components/link-list/LinkList";
import { LinkListSkeleton } from "@/components/link-list/LinkListSkeleton";
import { SearchBar } from "@/components/ui/SearchBar";
import { AppHeader } from "@/components/ui/AppHeader";
import {
  ActivityIcon,
  DownloadIcon,
  LogOutIcon,
  SelectIcon,
  TagIcon,
  UploadIcon,
} from "@/components/ui/Icon";
import type { MenuItem } from "@/components/ui/Menu";
import { SortSelect } from "@/components/ui/SortSelect";
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
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const addInputRef = useRef<HTMLInputElement | null>(null);

  const loadLinks = useCallback(
    async (offset = 0) => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (activeTag) params.set("tag", activeTag);
      if (sort !== "created_desc") params.set("sort", sort);
      if (offset) params.set("offset", String(offset));

      const res = await fetch(`/api/links?${params.toString()}`);
      const data = await res.json();
      const fetched: Link[] = data.links || [];
      const count = data.matchCount ?? 0;

      setLinks((prev) => (offset ? [...prev, ...fetched] : fetched));
      setMatchCount(count);
      if (!query && !activeTag) {
        setTotalLinks(count);
      }
      setHasMore(Boolean(data.hasMore));
      setLoading(false);
      setLoadingMore(false);
    },
    [query, activeTag, sort]
  );

  async function handleLoadMore() {
    setLoadingMore(true);
    await loadLinks(links.length);
  }

  const loadTags = useCallback(async () => {
    const res = await fetch("/api/tags");
    const data = await res.json();
    const fetched: Tag[] = data.tags || [];
    setTags(fetched);
    setTagColorOverrides(fetched);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount/query change
    loadLinks();
  }, [loadLinks]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    loadTags();
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
      loadLinks();
    }, 120);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeTag, sort]);

  function handleChanged() {
    loadLinks();
    loadTags();
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

  async function handleBulkDelete() {
    if (!bulkDeleteArmed) {
      setBulkDeleteArmed(true);
      setTimeout(() => setBulkDeleteArmed(false), 3000);
      return;
    }
    setBulkBusy(true);
    await fetch("/api/links/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds), action: "delete" }),
    });
    setBulkBusy(false);
    setBulkDeleteArmed(false);
    toggleSelectionMode();
    handleChanged();
  }

  async function handleBulkAddTag() {
    const tag = bulkTagInput.trim();
    if (!tag || selectedIds.size === 0) return;
    setBulkBusy(true);
    await fetch("/api/links/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds), action: "add_tag", tag }),
    });
    setBulkBusy(false);
    setBulkTagInput("");
    handleChanged();
  }

  async function handleCheckLinks() {
    setCheckingLinks(true);
    const res = await fetch("/api/links/check", { method: "POST" });
    const data = await res.json();
    const broken = new Set<number>(
      (data.results || []).filter((r: { ok: boolean }) => !r.ok).map((r: { id: number }) => r.id)
    );
    setBrokenIds(broken);
    setCheckingLinks(false);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const format = file.name.toLowerCase().endsWith(".csv") ? "csv" : "json";
    const content = await file.text();

    setImporting(true);
    setImportMessage(null);
    const res = await fetch("/api/links/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, content }),
    });
    const data = await res.json();
    setImporting(false);

    if (!res.ok) {
      setImportMessage(data.error || "Import failed");
      return;
    }

    setImportMessage(
      `Imported ${data.imported} link${data.imported === 1 ? "" : "s"}${data.skipped ? `, skipped ${data.skipped}` : ""}`
    );
    handleChanged();
    setTimeout(() => setImportMessage(null), 5000);
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  const hasFilter = query !== "" || activeTag !== null;
  const isEmpty = !loading && links.length === 0 && !hasFilter;
  const isNoResults = !loading && links.length === 0 && hasFilter;

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
    <div className={`mx-auto w-full max-w-[var(--container-wide)] px-5 py-8 ${selectionMode ? "pb-32" : ""}`}>
      <div className="mx-auto w-full max-w-[var(--container-col)]">
      <div className="mb-6 flex flex-col gap-3">
        <SearchBar
          value={query}
          onChange={setQuery}
          totalCount={totalLinks}
          resultCount={matchCount}
        />
        <LinkForm
          onCreated={handleChanged}
          availableTags={tags.map((t) => t.name)}
          inputRef={addInputRef}
        />
      </div>

      <div className="mb-5 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {tags.length > 0 && (
            <TagFilter tags={tags} activeTag={activeTag} onSelect={setActiveTag} totalCount={totalLinks} />
          )}
        </div>
        <SortSelect value={sort} onChange={setSort} />
      </div>
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
