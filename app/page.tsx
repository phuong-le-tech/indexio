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
  const [brokenIds, setBrokenIds] = useState<Set<number>>(new Set());
  const [checkingLinks, setCheckingLinks] = useState(false);

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

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  const hasFilter = query !== "" || activeTag !== null;
  const isEmpty = !loading && links.length === 0 && !hasFilter;
  const isNoResults = !loading && links.length === 0 && hasFilter;

  return (
    <div className="mx-auto w-full max-w-[var(--container-wide)] px-5 py-12">
      <div className="mx-auto w-full max-w-[var(--container-col)]">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[var(--text-xl)] text-[var(--color-ink)]">Indexio</h1>
        <div className="flex items-center gap-4">
          <ShortcutsHelp />
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
          brokenIds={brokenIds}
        />
      )}
    </div>
  );
}
