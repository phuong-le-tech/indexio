import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { readJson, withApiErrors } from "@/lib/api";
import { parseId, validateCollection, validateString, MAX_BULK_IDS, MAX_TAG_LENGTH } from "@/lib/validation";

export const POST = withApiErrors(async (request: NextRequest) => {
  const body = await readJson(request);
  const ids = validateCollection(body.ids, { name: "ids", maxItems: MAX_BULK_IDS }).map(parseId);
  const action = body.action;

  if (action === "delete") {
    await pool.query(`DELETE FROM links WHERE id = ANY($1::int[])`, [ids]);
    return NextResponse.json({ ok: true });
  }

  if (action === "add_tag") {
    const tagName = validateString(body.tag, { name: "tag", maxLength: MAX_TAG_LENGTH }).trim();
    if (!tagName) {
      return NextResponse.json({ error: "tag is required" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const tagResult = await client.query(
        `INSERT INTO tags (name) VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [tagName]
      );
      const tagId = tagResult.rows[0].id;

      await client.query(
        `INSERT INTO link_tags (link_id, tag_id)
         SELECT unnest($1::int[]), $2
         ON CONFLICT DO NOTHING`,
        [ids, tagId]
      );

      await client.query("COMMIT");
      return NextResponse.json({ ok: true });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Failed to bulk add tag:", err);
      return NextResponse.json({ error: "Failed to add tag" }, { status: 500 });
    } finally {
      client.release();
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
});
