import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { fetchMediaMetadata } from "@/lib/media";
import { toTsQuery } from "@/lib/search";
import { readJson, withApiErrors } from "@/lib/api";
import { validateNotes, validateTags, validateUrl, inputError } from "@/lib/validation";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

const SORT_OPTIONS = {
  created_desc: "l.created_at DESC",
  created_asc: "l.created_at ASC",
  title_asc: "LOWER(COALESCE(l.title, l.url)) ASC",
} as const;

export const GET = withApiErrors(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const tag = searchParams.get("tag")?.trim() || "";
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
  if (!Number.isInteger(limit) || !Number.isSafeInteger(offset)) throw inputError("Invalid pagination");
  const sortParam = searchParams.get("sort") || "";
  const orderBy =
    SORT_OPTIONS[sortParam as keyof typeof SORT_OPTIONS] ?? SORT_OPTIONS.created_desc;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (q) {
    const tsQuery = toTsQuery(q);
    if (tsQuery) {
      params.push(tsQuery);
      const idx = params.length;
      conditions.push(
        `(l.search_vector @@ to_tsquery('english', $${idx}) OR EXISTS (
           SELECT 1 FROM link_tags lt JOIN tags t ON t.id = lt.tag_id
           WHERE lt.link_id = l.id AND to_tsvector('english', t.name) @@ to_tsquery('english', $${idx})
         ))`
      );
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
            l.source, l.author, l.caption, l.transcript, l.mentioned_urls,
            COUNT(*) OVER()::int AS match_count,
            COALESCE(
              (SELECT json_agg(t.name ORDER BY t.name)
               FROM link_tags lt JOIN tags t ON t.id = lt.tag_id
               WHERE lt.link_id = l.id),
              '[]'
            ) AS tags
     FROM links l
     ${whereClause}
     ORDER BY ${orderBy}
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );

  const matchCount = result.rows[0]?.match_count ?? 0;

  return NextResponse.json({
    links: result.rows,
    matchCount,
    hasMore: offset + result.rows.length < matchCount,
  });
});

export const POST = withApiErrors(async (request: NextRequest) => {
  const body = await readJson(request);
  const parsedUrl = new URL(validateUrl(body.url));
  const notes = body.notes === undefined ? null : validateNotes(body.notes);
  const tags = body.tags === undefined ? [] : validateTags(body.tags);

  const metadata = await fetchMediaMetadata(parsedUrl.toString());

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const linkResult = await client.query(
      `INSERT INTO links (url, title, description, favicon_url, image_url, notes,
                          source, author, caption, transcript, mentioned_urls)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (url) DO UPDATE SET updated_at = now(),
         source = COALESCE(links.source, EXCLUDED.source),
         author = COALESCE(links.author, EXCLUDED.author),
         caption = COALESCE(links.caption, EXCLUDED.caption),
         transcript = COALESCE(links.transcript, EXCLUDED.transcript),
         mentioned_urls = COALESCE(links.mentioned_urls, EXCLUDED.mentioned_urls)
       RETURNING id`,
      [
        parsedUrl.toString(),
        metadata.title,
        metadata.description,
        metadata.faviconUrl,
        metadata.imageUrl,
        notes,
        metadata.source,
        metadata.author,
        metadata.caption,
        metadata.transcript,
        metadata.mentioned_urls,
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
});
