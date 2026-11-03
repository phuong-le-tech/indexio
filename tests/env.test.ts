import { expect, test } from "vitest";
import { validateEnv } from "../lib/env";

// API: pure validateEnv(env), no process mutation. Errors name the offending key.
// Cookie default is false for local HTTP, with an explicit true/false override.
const valid = {
  DATABASE_URL: "postgresql://test:test@localhost:55432/indexio_test",
  APP_PASSWORD: "test-only-password",
  SESSION_SECRET: "s".repeat(32),
  NODE_ENV: "production" as const,
};

test.each([
  ["DATABASE_URL", undefined], ["DATABASE_URL", ""],
  ["APP_PASSWORD", undefined], ["APP_PASSWORD", ""],
  ["SESSION_SECRET", undefined], ["SESSION_SECRET", ""],
])("AC3_missing_empty: %s=%s", (key, value) => {
  const env = { ...valid, [key]: value };

  expect(() => validateEnv(env)).toThrow(new RegExp(key));
});

test.each(["change-me", "change-me".repeat(5), "s".repeat(31)])(
  "AC3_rejects_production_placeholder_or_short_secret: %s", (secret) => {
    expect(() => validateEnv({ ...valid, SESSION_SECRET: secret })).toThrow(/SESSION_SECRET/);
  },
);

test("AC3_accepts_32_character_production_secret", () => {
  expect(() => validateEnv(valid)).not.toThrow();
  const env = validateEnv(valid);

  expect(env).toEqual({
    DATABASE_URL: valid.DATABASE_URL,
    APP_PASSWORD: valid.APP_PASSWORD,
    SESSION_SECRET: valid.SESSION_SECRET,
    COOKIE_SECURE: false,
  });
});

test.each(["APP_PASSWORD", "DATABASE_URL"])("AC3_rejects_production_placeholder: %s", (key) => {
  expect(() => validateEnv({ ...valid, [key]: "change-me" })).toThrow(new RegExp(key));
});

test.each([["true", true], ["false", false]] as const)(
  "AC4_cookie_secure_override: %s", (override, expected) => {
    expect(() => validateEnv({ ...valid, COOKIE_SECURE: override })).not.toThrow();
    const env = validateEnv({ ...valid, COOKIE_SECURE: override });

    expect(env.COOKIE_SECURE).toBe(expected);
  },
);
