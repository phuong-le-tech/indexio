import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { isTagColorFamily } from "@/lib/tagColors";
import { readJson, withApiErrors } from "@/lib/api";
import { parseId, validateString, MAX_TAG_LENGTH } from "@/lib/validation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const PATCH = withApiErrors(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  const tagId = parseId(id);

  const body = await readJson(request);
  const hasName = "name" in body;
  const hasColor = "color" in body;

  if (!hasName && !hasColor) {
    return NextResponse.json({ error: "name or color is required" }, { status: 400 });
  }

  let name: string | undefined;
  if (hasName) {
    name = validateString(body.name, { name: "tag", maxLength: MAX_TAG_LENGTH }).trim();
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
  }

  let color: string | null | undefined;
  if (hasColor) {
    color = body.color === null ? null : String(body.color);
    if (color !== null && !isTagColorFamily(color)) {
      return NextResponse.json({ error: "Invalid color" }, { status: 400 });
    }
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  if (name !== undefined) {
    values.push(name);
    setClauses.push(`name = $${values.length}`);
  }
  if (color !== undefined) {
    values.push(color);
    setClauses.push(`color = $${values.length}`);
  }
  values.push(tagId);

  try {
    const result = await pool.query(
      `UPDATE tags SET ${setClauses.join(", ")} WHERE id = $${values.length} RETURNING id, name, color`,
      values
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
});

export const DELETE = withApiErrors(async (_request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  const tagId = parseId(id);

  await pool.query(`DELETE FROM tags WHERE id = $1`, [tagId]);
  return NextResponse.json({ ok: true });
});

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}
