import { NextRequest, NextResponse } from "next/server";
import { attemptLogin, createSessionToken, COOKIE_NAME } from "@/lib/auth";
import { validateEnv } from "@/lib/env";
import { readJson, withApiErrors } from "@/lib/api";

export const POST = withApiErrors(async (request: NextRequest) => {
  const body = await readJson(request);
  if (typeof body.password !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const result = attemptLogin(body.password);
  if (result === "throttled") {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }
  if (result === "invalid") {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: validateEnv(process.env).COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
});

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
