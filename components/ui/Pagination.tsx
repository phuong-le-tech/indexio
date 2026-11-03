"use client";

import { Button } from "@/components/ui/Button";
import { PAGE_SIZE, pageRange, totalPages } from "@/lib/pagination";

interface PaginationProps {
  page: number;
  matchCount: number;
  onPageChange: (page: number) => void;
  loading: boolean;
}

export function Pagination({ page, matchCount, onPageChange, loading }: Readonly<PaginationProps>) {
  if (matchCount <= PAGE_SIZE) return null;
  const pages = totalPages(matchCount, PAGE_SIZE);
  const { from, to } = pageRange(page, PAGE_SIZE, matchCount);

  return (
    <nav aria-label="Pagination" className="mt-6 flex flex-wrap items-center justify-center gap-3">
      <Button variant="secondary" disabled={loading || page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </Button>
      <p aria-live="polite" aria-atomic="true" className="text-center text-sm text-[var(--color-ink-2)]">
        <span className="block">Page {page} of {pages}</span>
        <span className="block font-mono text-xs">{from}-{to} of {matchCount}</span>
      </p>
      <Button variant="secondary" disabled={loading || page >= pages} onClick={() => onPageChange(page + 1)}>
        Next
      </Button>
    </nav>
  );
}
