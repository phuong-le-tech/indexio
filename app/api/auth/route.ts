import { NextRequest, NextResponse } from "next/server";
import { attemptLogin, createSessionToken, COOKIE_NAME } from "@/lib/auth";
import { validateEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("password" in body) || typeof body.password !== "string") {
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
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
