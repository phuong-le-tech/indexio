import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { parseCsv } from "@/lib/csv";
import { readJson, withApiErrors, MAX_IMPORT_REQUEST_BYTES } from "@/lib/api";
import { validateImportSize, validateNotes, validateTags, validateUrl } from "@/lib/validation";

interface ImportRow {
  url: string;
  title: string | null;
  description: string | null;
  notes: string | null;
  tags: string[];
}

function isValidUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function rowsFromJson(content: string): { rows: ImportRow[]; errors: number } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { rows: [], errors: 1 };
  }

  if (!Array.isArray(parsed)) {
    return { rows: [], errors: 1 };
  }
  validateImportSize(0, parsed.length);

  const rows: ImportRow[] = [];
  let errors = 0;

  for (const entry of parsed) {
    const url = typeof entry?.url === "string" ? entry.url.trim() : "";
    if (!isValidUrl(url)) {
      errors++;
      continue;
    }
    rows.push({
      url,
      title: typeof entry.title === "string" ? entry.title : null,
      description: typeof entry.description === "string" ? entry.description : null,
      notes: typeof entry.notes === "string" ? entry.notes : null,
      tags: entry.tags === undefined ? [] : validateTags(entry.tags),
    });
  }

  return { rows, errors };
}

function rowsFromCsv(content: string): { rows: ImportRow[]; errors: number } {
  const table = parseCsv(content);
  validateImportSize(0, Math.max(0, table.length - 1));
  if (table.length === 0) {
    return { rows: [], errors: 1 };
  }

  const header = table[0].map((h) => h.trim().toLowerCase());
  const idx = {
    url: header.indexOf("url"),
    title: header.indexOf("title"),
    description: header.indexOf("description"),
    notes: header.indexOf("notes"),
    tags: header.indexOf("tags"),
  };

  if (idx.url === -1) {
    return { rows: [], errors: 1 };
  }

  const rows: ImportRow[] = [];
  let errors = 0;

  for (const cells of table.slice(1)) {
    const url = (cells[idx.url] || "").trim();
    if (!isValidUrl(url)) {
      errors++;
      continue;
    }
    const tagsField = idx.tags !== -1 ? cells[idx.tags] || "" : "";
    rows.push({
      url,
      title: idx.title !== -1 ? cells[idx.title] || null : null,
      description: idx.description !== -1 ? cells[idx.description] || null : null,
      notes: idx.notes !== -1 ? cells[idx.notes] || null : null,
      tags: tagsField
        .split(";")
        .map((t) => t.trim())
        .filter(Boolean),
    });
  }

  return { rows, errors };
}

export const POST = withApiErrors(async (request: NextRequest) => {
  const body = await readJson(request, MAX_IMPORT_REQUEST_BYTES);
  const format = body.format === "csv" ? "csv" : "json";
  const content = typeof body.content === "string" ? body.content : "";
  validateImportSize(Buffer.byteLength(content, "utf8"), 0);

  const { rows, errors: parseErrors } = format === "csv" ? rowsFromCsv(content) : rowsFromJson(content);
  for (const row of rows) {
    validateUrl(row.url);
    if (row.notes !== null) validateNotes(row.notes);
    validateTags(row.tags);
  }

  if (rows.length === 0) {
    return NextResponse.json({ imported: 0, skipped: parseErrors, error: "No valid rows found" }, { status: 400 });
  }

  const client = await pool.connect();
  let imported = 0;
  try {
    await client.query("BEGIN");

    for (const row of rows) {
      const linkResult = await client.query(
        `INSERT INTO links (url, title, description, notes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (url) DO UPDATE SET updated_at = now()
         RETURNING id`,
        [row.url, row.title, row.description, row.notes]
      );
      const linkId = linkResult.rows[0].id;

      for (const tagName of row.tags) {
        const tagResult = await client.query(
          `INSERT INTO tags (name) VALUES ($1)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [tagName]
        );
        await client.query(
          `INSERT INTO link_tags (link_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [linkId, tagResult.rows[0].id]
        );
      }
      imported++;
    }

    await client.query("COMMIT");
    return NextResponse.json({ imported, skipped: parseErrors });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to import links:", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  } finally {
    client.release();
  }
});
