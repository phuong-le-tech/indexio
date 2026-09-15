export function toTsQuery(rawQuery: string) {
  const terms = rawQuery
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => term.replace(/[^\w]/g, ""))
    .filter(Boolean);

  if (terms.length === 0) return null;
  return terms.map((term) => `${term}:*`).join(" & ");
}
