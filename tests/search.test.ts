import { expect, test } from "vitest";
import { toTsQuery } from "../lib/search";

test.each([
  { input: "", expected: null },
  { input: " \t\n", expected: null },
  { input: "! & | :* ()", expected: null },
  { input: "indexio", expected: "indexio:*" },
  { input: "  hello\tworld  ", expected: "hello:* & world:*" },
  { input: "foo'bar | baz:*", expected: "foobar:* & baz:*" },
  { input: "tag_1 alpha-beta", expected: "tag_1:* & alphabeta:*" },
])("AC9_search_tokens: $input", ({ input, expected }) => {
  const query = toTsQuery(input);

  expect(query).toBe(expected);
});
