import { afterEach, beforeEach, expect, test, vi } from "vitest";

// API: attemptLogin(password) atomically compares and records failures per process.
// Five failures in 60 seconds are invalid; further attempts are throttled,
// including correct passwords. Modules are reset to isolate process-local state.
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("APP_PASSWORD", "test-password");
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
});
afterEach(() => vi.useRealTimers());

test.each([
  ["test-password", true], ["wrong", false], ["", false],
  ["test-passwor", false], ["test-password-longer", false],
  ["tést-password", false], ["🔑", false],
])("AC4_password_comparison: %s", async (password, expected) => {
  const { checkPassword } = await import("../lib/auth");

  expect(checkPassword(password as string)).toBe(expected);
});

test("AC4_password_comparison_accepts_equal_unicode", async () => {
  vi.stubEnv("APP_PASSWORD", "🔑 café");
  const { checkPassword } = await import("../lib/auth");

  expect(checkPassword("🔑 café")).toBe(true);
});

test("AC4_throttle_allows_five_failures_then_blocks", async () => {
  const { attemptLogin } = await import("../lib/auth");

  const result = Promise.resolve().then(() => Array.from({ length: 6 }, () => attemptLogin("wrong")));

  await expect(result).resolves.toEqual(["invalid", "invalid", "invalid", "invalid", "invalid", "throttled"]);
});

test("AC4_throttle_bounds_concurrent_attempts", async () => {
  const { attemptLogin } = await import("../lib/auth");

  const result = Promise.all(Array.from({ length: 7 }, async () => attemptLogin("wrong")));

  await expect(result).resolves.toEqual(["invalid", "invalid", "invalid", "invalid", "invalid", "throttled", "throttled"]);
});

test("AC4_throttle_blocks_correct_password_in_active_window", async () => {
  const { attemptLogin } = await import("../lib/auth");
  await expect(Promise.resolve().then(() => Array.from({ length: 5 }, () => attemptLogin("wrong"))))
    .resolves.toEqual(Array(5).fill("invalid"));

  expect(attemptLogin("test-password")).toBe("throttled");
});

test("AC4_throttle_remains_blocked_before_sixty_seconds", async () => {
  const { attemptLogin } = await import("../lib/auth");
  await expect(Promise.resolve().then(() => Array.from({ length: 5 }, () => attemptLogin("wrong"))))
    .resolves.toEqual(Array(5).fill("invalid"));
  vi.advanceTimersByTime(59_999);

  expect(attemptLogin("test-password")).toBe("throttled");
});

test("AC4_throttle_expiry_releases_at_sixty_seconds", async () => {
  const { attemptLogin } = await import("../lib/auth");
  await expect(Promise.resolve().then(() => Array.from({ length: 5 }, () => attemptLogin("wrong"))))
    .resolves.toEqual(Array(5).fill("invalid"));
  vi.advanceTimersByTime(60_000);

  expect(attemptLogin("test-password")).toBe("allowed");
});

test("AC4_successful_logins_do_not_consume_failure_budget", async () => {
  const { attemptLogin } = await import("../lib/auth");

  const result = Promise.resolve().then(() => Array.from({ length: 7 }, () => attemptLogin("test-password")));

  await expect(result).resolves.toEqual(Array(7).fill("allowed"));
});
