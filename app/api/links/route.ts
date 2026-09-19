import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { fetchMetadata } from "@/lib/metadata";
import { toTsQuery } from "@/lib/search";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const tag = searchParams.get("tag")?.trim() || "";
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (q) {
    const tsQuery = toTsQuery(q);
    if (tsQuery) {
      params.push(tsQuery);
      conditions.push(`l.search_vector @@ to_tsquery('english', $${params.length})`);
    }
  }

  if (tag) {
    params.push(tag);
    conditions.push(
      `l.id IN (SELECT lt.link_id FROM link_tags lt JOIN tags t ON t.id = lt.tag_id WHERE t.name = $${params.length})`
    );
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const result = await pool.query(
    `SELECT l.id, l.url, l.title, l.description, l.favicon_url, l.image_url, l.notes, l.created_at,
            COUNT(*) OVER()::int AS match_count,
            COALESCE(
              (SELECT json_agg(t.name ORDER BY t.name)
               FROM link_tags lt JOIN tags t ON t.id = lt.tag_id
               WHERE lt.link_id = l.id),
              '[]'
            ) AS tags
     FROM links l
     ${whereClause}
     ORDER BY l.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );

  const matchCount = result.rows[0]?.match_count ?? 0;

  return NextResponse.json({
    links: result.rows,
    matchCount,
    hasMore: offset + result.rows.length < matchCount,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : null;
  const tags: string[] = Array.isArray(body.tags)
    ? body.tags.map((t: unknown) => String(t).trim()).filter(Boolean)
    : [];

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("invalid protocol");
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const metadata = await fetchMetadata(parsedUrl.toString());

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const linkResult = await client.query(
      `INSERT INTO links (url, title, description, favicon_url, image_url, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (url) DO UPDATE SET updated_at = now()
       RETURNING id`,
      [
        parsedUrl.toString(),
        metadata.title,
        metadata.description,
        metadata.faviconUrl,
        metadata.imageUrl,
        notes,
      ]
    );
    const linkId = linkResult.rows[0].id;

    for (const tagName of tags) {
      const tagResult = await client.query(
        `INSERT INTO tags (name) VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [tagName]
      );
      const tagId = tagResult.rows[0].id;
      await client.query(
        `INSERT INTO link_tags (link_id, tag_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [linkId, tagId]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ id: linkId }, { status: 201 });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to create link:", err);
    return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
  } finally {
    client.release();
  }
}
