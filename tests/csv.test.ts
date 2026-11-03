import { expect, test } from "vitest";
import { parseCsv } from "../lib/csv";

test.each([
  { name: "empty input", input: "", expected: [] },
  { name: "one row", input: "url,notes", expected: [["url", "notes"]] },
  { name: "CRLF", input: "a,b\r\nc,d\r\n", expected: [["a", "b"], ["c", "d"]] },
  { name: "quoted commas", input: '"a,b",c', expected: [["a,b", "c"]] },
  { name: "quoted newlines", input: '"a\nb",c', expected: [["a\nb", "c"]] },
  { name: "escaped quotes", input: '"say ""hi""",c', expected: [['say "hi"', "c"]] },
  { name: "empty fields", input: ",a,", expected: [["", "a", ""]] },
])("AC9_csv_preserves_fields: $name", ({ input, expected }) => {
  const rows = parseCsv(input);

  expect(rows).toEqual(expected);
});
