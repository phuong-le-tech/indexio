import { expect, test } from "vitest";
import { clampPage, pageRange, totalPages } from "../lib/pagination";

const totalPagesCases = [
  { matchCount: 0, expected: 1 },
  { matchCount: 1, expected: 1 },
  { matchCount: 24, expected: 1 },
  { matchCount: 25, expected: 2 },
  { matchCount: 48, expected: 2 },
  { matchCount: 49, expected: 3 },
];

test.each(totalPagesCases)("totalPages: $matchCount results at page size 24 yields $expected logical pages", ({ matchCount, expected }) => {
  expect(totalPages(matchCount, 24)).toBe(expected);
});

const clampPageCases = [
  { page: -1, expected: 1 },
  { page: 0, expected: 1 },
  { page: 1, expected: 1 },
  { page: 2, expected: 2 },
  { page: 3, expected: 3 },
  { page: 999, expected: 3 },
];

test.each(clampPageCases)("clampPage: page $page within 1..3 resolves to $expected", ({ page, expected }) => {
  expect(clampPage(page, 3)).toBe(expected);
});

const pageRangeCases = [
  { label: "empty results", page: 1, matchCount: 0, expected: { from: 0, to: 0 } },
  { label: "single result", page: 1, matchCount: 1, expected: { from: 1, to: 1 } },
  { label: "exact full page", page: 1, matchCount: 24, expected: { from: 1, to: 24 } },
  { label: "last exact full page", page: 2, matchCount: 48, expected: { from: 25, to: 48 } },
  { label: "partial last page", page: 3, matchCount: 60, expected: { from: 49, to: 60 } },
  { label: "page below first clamps to first", page: 0, matchCount: 60, expected: { from: 1, to: 24 } },
  { label: "page above last clamps to last", page: 999, matchCount: 60, expected: { from: 49, to: 60 } },
];

test.each(pageRangeCases)("pageRange: $label", ({ page, matchCount, expected }) => {
  expect(pageRange(page, 24, matchCount)).toEqual(expected);
});
