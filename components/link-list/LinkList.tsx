"use client";

import Image from "next/image";
import type { Link } from "@/lib/types";

interface LinkListProps {
  links: Link[];
  onDeleted: () => void;
}

export function LinkList({ links, onDeleted }: LinkListProps) {
  async function handleDelete(id: number) {
    await fetch(`/api/links/${id}`, { method: "DELETE" });
    onDeleted();
  }

  if (links.length === 0) {
    return <p className="text-sm text-gray-500">No links yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {links.map((link) => {
        const domain = (() => {
          try {
            return new URL(link.url).hostname;
          } catch {
            return link.url;
          }
        })();

        return (
          <li
            key={link.id}
            className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4"
          >
            {link.favicon_url ? (
              <Image
                src={link.favicon_url}
                alt=""
                width={20}
                height={20}
                className="mt-1 rounded"
                unoptimized
              />
            ) : (
              <div className="mt-1 h-5 w-5 rounded bg-gray-200" />
            )}
            <div className="min-w-0 flex-1">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gray-900 hover:underline"
              >
                {link.title || link.url}
              </a>
              <p className="text-xs text-gray-500">{domain}</p>
              {link.description && (
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{link.description}</p>
              )}
              {link.notes && <p className="mt-1 text-sm italic text-gray-500">{link.notes}</p>}
              {link.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {link.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => handleDelete(link.id)}
              className="text-xs text-gray-400 hover:text-red-600"
            >
              Delete
            </button>
          </li>
        );
      })}
    </ul>
  );
}
