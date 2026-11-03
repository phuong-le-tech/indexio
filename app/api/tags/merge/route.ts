import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { readJson, withApiErrors } from "@/lib/api";
import { parseId } from "@/lib/validation";

export const POST = withApiErrors(async (request: NextRequest) => {
  const body = await readJson(request);
  const fromId = parseId(body.fromId);
  const intoId = parseId(body.intoId);
  if (fromId === intoId) {
    return NextResponse.json({ error: "Cannot merge a tag into itself" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const intoExists = await client.query(`SELECT id FROM tags WHERE id = $1`, [intoId]);
    if (intoExists.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Target tag not found" }, { status: 404 });
    }

    await client.query(
      `INSERT INTO link_tags (link_id, tag_id)
       SELECT link_id, $1 FROM link_tags WHERE tag_id = $2
       ON CONFLICT DO NOTHING`,
      [intoId, fromId]
    );

    const deleted = await client.query(`DELETE FROM tags WHERE id = $1 RETURNING id`, [fromId]);
    if (deleted.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Source tag not found" }, { status: 404 });
    }

    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to merge tags:", err);
    return NextResponse.json({ error: "Failed to merge tags" }, { status: 500 });
  } finally {
    client.release();
  }
});
