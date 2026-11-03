import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { readJson, withApiErrors } from "@/lib/api";
import { parseId, validateNotes, validateTags } from "@/lib/validation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const PATCH = withApiErrors(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  const linkId = parseId(id);
  const body = await readJson(request);
  const notes = body.notes === undefined ? undefined : validateNotes(body.notes);
  const tags = body.tags === undefined ? undefined : validateTags(body.tags);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (notes !== undefined) {
      await client.query(`UPDATE links SET notes = $1, updated_at = now() WHERE id = $2`, [
        notes,
        linkId,
      ]);
    }

    if (tags !== undefined) {
      await client.query(`DELETE FROM link_tags WHERE link_id = $1`, [linkId]);
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
    }

    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to update link:", err);
    return NextResponse.json({ error: "Failed to update link" }, { status: 500 });
  } finally {
    client.release();
  }
});

export const DELETE = withApiErrors(async (_request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  const linkId = parseId(id);

  await pool.query(`DELETE FROM links WHERE id = $1`, [linkId]);
  return NextResponse.json({ ok: true });
});
