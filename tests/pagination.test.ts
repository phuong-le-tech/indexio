import assert from "node:assert/strict";
import test from "node:test";
import { clampPage, pageRange, totalPages } from "../lib/pagination";

const totalPagesCases = [
  { matchCount: 0, expected: 1 },
  { matchCount: 1, expected: 1 },
  { matchCount: 24, expected: 1 },
  { matchCount: 25, expected: 2 },
  { matchCount: 48, expected: 2 },
  { matchCount: 49, expected: 3 },
];

totalPagesCases.forEach(({ matchCount, expected }) => {
  void test(`AC11_totalPages: ${matchCount} results at page size 24 yields ${expected} logical pages`, () => {
    const pageSize = 24;

    const actual = totalPages(matchCount, pageSize);

    assert.equal(actual, expected);
  });
});

const clampPageCases = [
  { page: -1, expected: 1 },
  { page: 0, expected: 1 },
  { page: 1, expected: 1 },
  { page: 2, expected: 2 },
  { page: 3, expected: 3 },
  { page: 999, expected: 3 },
];

clampPageCases.forEach(({ page, expected }) => {
  void test(`AC11_clampPage: page ${page} within 1..3 resolves to ${expected}`, () => {
    const numberOfPages = 3;

    const actual = clampPage(page, numberOfPages);

    assert.equal(actual, expected);
  });
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

pageRangeCases.forEach(({ label, page, matchCount, expected }) => {
  void test(`AC11_pageRange: ${label}`, () => {
    const pageSize = 24;

    const actual = pageRange(page, pageSize, matchCount);

    assert.deepEqual(actual, expected);
  });
});
