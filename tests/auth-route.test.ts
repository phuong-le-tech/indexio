import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

// Exercise the actual handler and JWT implementation, never mock project modules.
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:55432/test");
  vi.stubEnv("APP_PASSWORD", "test-password");
  vi.stubEnv("SESSION_SECRET", "s".repeat(32));
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("COOKIE_SECURE", "false");
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
});
afterEach(() => vi.useRealTimers());

function request(body: string) {
  return new NextRequest("http://localhost:3000/api/auth", {
    method: "POST", headers: { "content-type": "application/json" }, body,
  });
}

test.each(["{", "null", "{}", '{"password":null}', '{"password":42}'])(
  "AC4_login_contract_malformed_body_returns_400: %s", async (body) => {
    const { POST } = await import("../app/api/auth/route");

    const result = POST(request(body));

    await expect(result).resolves.toMatchObject({ status: 400 });
    expect(await (await result).json()).toEqual({ error: "Invalid request" });
  },
);

test("AC4_login_contract_wrong_password_returns_401", async () => {
  const { POST } = await import("../app/api/auth/route");

  const response = await POST(request('{"password":"wrong"}'));

  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: "Invalid password" });
});

test("AC4_login_contract_sixth_failure_returns_429", async () => {
  const { POST } = await import("../app/api/auth/route");
  await Promise.all(Array.from({ length: 5 }, () => POST(request('{"password":"wrong"}'))));

  const response = await POST(request('{"password":"wrong"}'));

  expect(response.status).toBe(429);
  expect(await response.json()).toEqual({ error: "Too many attempts" });
});

test.each([["false", false], ["true", true]] as const)(
  "AC4_login_contract_valid_jwt_and_cookie_secure_override: %s", async (override, secure) => {
    vi.stubEnv("COOKIE_SECURE", override);
    const { POST } = await import("../app/api/auth/route");
    const { COOKIE_NAME, verifySessionToken } = await import("../lib/auth");

    const response = await POST(request('{"password":"test-password"}'));
    const cookie = response.cookies.get(COOKIE_NAME);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(cookie).toMatchObject({ httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 2_592_000 });
    expect(await verifySessionToken(cookie!.value)).toBe(true);
  },
);
