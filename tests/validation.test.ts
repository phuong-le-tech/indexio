import { expect, test } from "vitest";
import { parseId, validateCollection, validateImportSize, validateString } from "../lib/validation";

// API: validators return the validated value, or throw Error with the messages
// asserted below. Optional fields are handled by callers before validation.
// parseId accepts positive PostgreSQL int4 IDs as numbers or decimal strings.
// String/collection caps are explicit arguments so routes can share validators.
// Suggested route caps: URL 4096 chars, tag 100 chars, notes 10000 chars,
// bulk 500 IDs, import 2 MiB / 1000 rows. Import size is UTF-8 bytes, not chars.
// Notes allow empty strings; required URL/tag strings and collections do not.

test.each([undefined, null, "", "abc", "1x", "1.5", 1.5, "1e2", "0x10", 0, -1, "-1", 2_147_483_648, "2147483648", NaN, Infinity, {}, []].map((value) => ({ value })))(
  "AC7_input_boundaries_rejects_invalid_id: $# $value", ({ value }) => {
    expect(() => parseId(value)).toThrow(new Error("Invalid id"));
  },
);

test.each([["1", 1], [1, 1], ["2147483647", 2_147_483_647]] as const)(
  "AC7_input_boundaries_accepts_postgres_id: %s", (value, expected) => {
    expect(() => parseId(value)).not.toThrow();
    expect(parseId(value)).toBe(expected);
  },
);

test.each([
  { name: "url", maxLength: 4096 },
  { name: "tag", maxLength: 100 },
  { name: "notes", maxLength: 10_000 },
])("AC7_input_boundaries_accepts_string_at_cap: $name", (options) => {
  const value = "a".repeat(options.maxLength);

  expect(() => validateString(value, options)).not.toThrow();
  expect(validateString(value, options)).toBe(value);
});

test.each([
  { name: "url", maxLength: 4096 },
  { name: "tag", maxLength: 100 },
  { name: "notes", maxLength: 10_000 },
])("AC7_input_boundaries_rejects_string_cap_plus_one: $name", (options) => {
  const value = "a".repeat(options.maxLength + 1);

  expect(() => validateString(value, options)).toThrow(new Error(`Invalid ${options.name}`));
});

test.each([undefined, null, 42, {}, [], ""].map((value) => ({ value })))(
  "AC7_input_boundaries_rejects_missing_or_invalid_required_string: $# $value", ({ value }) => {
    expect(() => validateString(value, { name: "tag", maxLength: 100 })).toThrow(new Error("Invalid tag"));
  },
);

test("AC7_input_boundaries_accepts_one_character_string", () => {
  expect(() => validateString("a", { name: "tag", maxLength: 100 })).not.toThrow();
  expect(validateString("a", { name: "tag", maxLength: 100 })).toBe("a");
});

test("AC7_input_boundaries_accepts_empty_notes", () => {
  const options = { name: "notes", maxLength: 10_000, allowEmpty: true };

  expect(() => validateString("", options)).not.toThrow();
  expect(validateString("", options)).toBe("");
});

test.each([undefined, null, "1", 1, {}, []].map((value) => ({ value })))(
  "AC7_input_boundaries_rejects_missing_or_invalid_collection: $# $value", ({ value }) => {
    expect(() => validateCollection(value, { name: "ids", maxItems: 500 })).toThrow(new Error("Invalid ids"));
  },
);

test.each([{ value: [1] }, { value: Array(500).fill(1) }])("AC7_input_boundaries_accepts_collection_one_or_cap: %#", ({ value }) => {
  expect(() => validateCollection(value, { name: "ids", maxItems: 500 })).not.toThrow();
  expect(validateCollection(value, { name: "ids", maxItems: 500 })).toEqual(value);
});

test("AC7_input_boundaries_rejects_collection_cap_plus_one", () => {
  expect(() => validateCollection(Array(501).fill(1), { name: "ids", maxItems: 500 })).toThrow(new Error("Invalid ids"));
});

test.each([{ bytes: 1, rows: 1 }, { bytes: 2_097_152, rows: 1000 }])(
  "AC7_input_boundaries_accepts_import_one_or_cap: $bytes bytes / $rows rows", ({ bytes, rows }) => {
    expect(() => validateImportSize(bytes, rows)).not.toThrow();
  },
);

test.each([{ bytes: 2_097_153, rows: 1 }, { bytes: 1, rows: 1001 }])(
  "AC7_input_boundaries_rejects_import_cap_plus_one: $bytes bytes / $rows rows", ({ bytes, rows }) => {
    expect(() => validateImportSize(bytes, rows)).toThrow(new Error("Import limit exceeded"));
  },
);
