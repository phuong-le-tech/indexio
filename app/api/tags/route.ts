import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { withApiErrors } from "@/lib/api";

export const GET = withApiErrors(async () => {
  const result = await pool.query(
    `SELECT t.id, t.name, t.color, COUNT(lt.link_id)::int AS link_count
     FROM tags t
     LEFT JOIN link_tags lt ON lt.tag_id = t.id
     GROUP BY t.id, t.name, t.color
     ORDER BY t.name`
  );
  return NextResponse.json({ tags: result.rows });
});
