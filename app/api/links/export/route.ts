import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

function toCsvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function toCsv(rows: ExportRow[]): string {
  const header = ["url", "title", "description", "notes", "tags", "created_at"];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.url,
        row.title ?? "",
        row.description ?? "",
        row.notes ?? "",
        row.tags.join("; "),
        row.created_at.toISOString(),
      ]
        .map(toCsvField)
        .join(",")
    );
  }
  return lines.join("\n");
}

interface ExportRow {
  url: string;
  title: string | null;
  description: string | null;
  notes: string | null;
  tags: string[];
  created_at: Date;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "json";

  const result = await pool.query<ExportRow>(
    `SELECT l.url, l.title, l.description, l.notes, l.created_at,
            COALESCE(
              (SELECT json_agg(t.name ORDER BY t.name)
               FROM link_tags lt JOIN tags t ON t.id = lt.tag_id
               WHERE lt.link_id = l.id),
              '[]'
            ) AS tags
     FROM links l
     ORDER BY l.created_at DESC`
  );

  const date = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    return new NextResponse(toCsv(result.rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="indexio-export-${date}.csv"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(result.rows, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="indexio-export-${date}.json"`,
    },
  });
}
