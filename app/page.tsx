"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LinkForm } from "@/components/link-form/LinkForm";
import { LinkList } from "@/components/link-list/LinkList";
import { LinkListSkeleton } from "@/components/link-list/LinkListSkeleton";
import { SearchBar } from "@/components/ui/SearchBar";
import { TagFilter } from "@/components/ui/TagFilter";
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
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [totalLinks, setTotalLinks] = useState<number | null>(null);

  const loadLinks = useCallback(async () => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (activeTag) params.set("tag", activeTag);

    const res = await fetch(`/api/links?${params.toString()}`);
    const data = await res.json();
    setLinks(data.links || []);
    setLoading(false);
    if (!query && !activeTag) {
      setTotalLinks((data.links || []).length);
    }
  }, [query, activeTag]);

  const loadTags = useCallback(async () => {
    const res = await fetch("/api/tags");
    const data = await res.json();
    setTags(data.tags || []);
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
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
      setLoading(true);
      loadLinks();
    }, 120);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeTag]);

  function handleChanged() {
    loadLinks();
    loadTags();
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
    <div className="mx-auto w-full max-w-[var(--container-col)] px-5 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[var(--text-xl)] text-[var(--color-ink)]">Indexio</h1>
        <button
          onClick={handleLogout}
          className="text-[var(--text-sm)] text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
        >
          Log out
        </button>
      </div>

      <div className="mb-6 flex flex-col gap-3">
        <SearchBar
          value={query}
          onChange={setQuery}
          totalCount={totalLinks ?? 0}
          resultCount={links.length}
        />
        <LinkForm onCreated={handleChanged} />
      </div>

      {tags.length > 0 && (
        <div className="mb-4">
          <TagFilter tags={tags} activeTag={activeTag} onSelect={setActiveTag} totalCount={totalLinks ?? 0} />
        </div>
      )}

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

      {!loading && links.length > 0 && <LinkList links={links} onDeleted={handleChanged} />}
    </div>
  );
}
