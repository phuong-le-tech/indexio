export function totalPages(_matchCount: number, _pageSize: number): number {
  throw new Error("not implemented");
}

export function clampPage(_page: number, _totalPages: number): number {
  throw new Error("not implemented");
}

export function pageRange(
  _page: number,
  _pageSize: number,
  _matchCount: number,
): { from: number; to: number } {
  throw new Error("not implemented");
}
