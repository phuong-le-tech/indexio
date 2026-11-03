export const PAGE_SIZE = 24;

export function totalPages(matchCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(matchCount / pageSize));
}

export function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1), totalPages);
}

export function pageRange(
  page: number,
  pageSize: number,
  matchCount: number,
): { from: number; to: number } {
  if (matchCount === 0) return { from: 0, to: 0 };
  const current = clampPage(page, totalPages(matchCount, pageSize));
  return { from: (current - 1) * pageSize + 1, to: Math.min(current * pageSize, matchCount) };
}
