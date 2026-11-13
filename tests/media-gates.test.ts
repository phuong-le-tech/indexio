import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const timeout = 300_000;
const gates = [
  { name: "lint", args: ["run", "lint"] },
  { name: "typecheck", args: ["run", "typecheck"] },
  // Exclude this file in the child suite so the test gate cannot recurse.
  { name: "test", args: ["test", "--", "--exclude", "tests/media-gates.test.ts"] },
  { name: "build", args: ["run", "build"] },
];

function runGate(args: string[]) {
  return new Promise<{ code: number | string | null; stdout: string; stderr: string }>((resolve) => {
    execFile("npm", args, {
      cwd: root,
      timeout,
      maxBuffer: 16 * 1024 * 1024,
      // Do not forward real credentials or Vitest worker state to subprocesses.
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        TMPDIR: process.env.TMPDIR,
        CI: "1",
        NODE_ENV: args.includes("build") ? "production" : "test",
        NEXT_TELEMETRY_DISABLED: "1",
        DATABASE_URL: "postgresql://media_test:media_test@127.0.0.1:1/media_test",
        APP_PASSWORD: "media-gates-dummy-password",
        SESSION_SECRET: "media-gates-dummy-session-secret-at-least-32-characters",
        COOKIE_SECURE: "false",
      },
    }, (error, stdout, stderr) => {
      resolve({ code: error ? (error.code ?? null) : 0, stdout, stderr });
    });
  });
}

// Both Next commands generate .next types; never run these gates concurrently.
describe.sequential("AC9_gates", () => {
  test.each(gates)("AC9_gates: $name exits 0", async ({ args }) => {
    const result = await runGate(args);
    expect(result.code, [
      `npm ${args.join(" ")} failed with exit ${String(result.code)}`,
      "stdout:", result.stdout,
      "stderr:", result.stderr,
    ].join("\n")).toBe(0);
  }, timeout + 30_000);
});
