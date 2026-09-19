import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const tagId = Number(id);
  if (!Number.isInteger(tagId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `UPDATE tags SET name = $1 WHERE id = $2 RETURNING id, name`,
      [name, tagId]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }
    return NextResponse.json({ tag: result.rows[0] });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "A tag with that name already exists. Use merge instead." },
        { status: 409 }
      );
    }
    console.error("Failed to rename tag:", err);
    return NextResponse.json({ error: "Failed to rename tag" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const tagId = Number(id);
  if (!Number.isInteger(tagId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await pool.query(`DELETE FROM tags WHERE id = $1`, [tagId]);
  return NextResponse.json({ ok: true });
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}
