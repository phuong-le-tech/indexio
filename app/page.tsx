"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LinkForm } from "@/components/link-form/LinkForm";
import { LinkList } from "@/components/link-list/LinkList";
import { TagFilter } from "@/components/ui/TagFilter";
import type { Link, Tag } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [links, setLinks] = useState<Link[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLinks = useCallback(async () => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (activeTag) params.set("tag", activeTag);

    const res = await fetch(`/api/links?${params.toString()}`);
    const data = await res.json();
    setLinks(data.links || []);
    setLoading(false);
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

  function handleChanged() {
    loadLinks();
    loadTags();
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Indexio</h1>
        <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-gray-700">
          Log out
        </button>
      </div>

      <div className="mb-6">
        <LinkForm onCreated={handleChanged} />
      </div>

      <div className="mb-4 space-y-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search links..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
        <TagFilter tags={tags} activeTag={activeTag} onSelect={setActiveTag} />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <LinkList links={links} onDeleted={handleChanged} />
      )}
    </div>
  );
}
