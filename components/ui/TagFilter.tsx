"use client";

import type { Tag } from "@/lib/types";

interface TagFilterProps {
  tags: Tag[];
  activeTag: string | null;
  onSelect: (tag: string | null) => void;
}

export function TagFilter({ tags, activeTag, onSelect }: TagFilterProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`rounded-full px-3 py-1 text-xs ${
          activeTag === null ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
        }`}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onSelect(tag.name)}
          className={`rounded-full px-3 py-1 text-xs ${
            activeTag === tag.name ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
          }`}
        >
          {tag.name} ({tag.link_count})
        </button>
      ))}
    </div>
  );
}
