import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  const result = await pool.query(
    `SELECT t.id, t.name, COUNT(lt.link_id)::int AS link_count
     FROM tags t
     LEFT JOIN link_tags lt ON lt.tag_id = t.id
     GROUP BY t.id, t.name
     ORDER BY t.name`
  );
  return NextResponse.json({ tags: result.rows });
}
