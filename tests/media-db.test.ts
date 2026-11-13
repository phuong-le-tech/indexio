import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { caption, page, transcript, videoUrl, vtt } from "./fixtures/media";

const { lookup, transport } = vi.hoisted(() => ({ lookup: vi.fn(), transport: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup }));
const exec = promisify(execFile);
const legacySchema = readFileSync(new URL("./fixtures/media-legacy.sql", import.meta.url), "utf8");
let container: string;
let databaseUrl: string;
let db: Pool;
let routes: typeof import("../app/api/links/route");
let routePool: Pool;

beforeAll(async () => {
  // A private disposable cluster, never DATABASE_URL from the developer's environment.
  const result = await exec("docker", ["run", "--rm", "-d", "-e", "POSTGRES_PASSWORD=media-test-password",
    "-e", "POSTGRES_DB=media_test", "-p", "127.0.0.1::5432", "postgres:17-alpine"]);
  container = result.stdout.trim();
  const port = (await exec("docker", ["port", container, "5432/tcp"])).stdout.trim().split(":").at(-1);
  databaseUrl = `postgresql://postgres:media-test-password@127.0.0.1:${port}/media_test`;
  db = new Pool({ connectionString: databaseUrl });
  // Readiness polling is setup only; behavior assertions use no sleeps or external network.
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { await db.query("SELECT 1"); ready = true; break; } catch { await delay(50); }
  }
  if (!ready) throw new Error("Disposable PostgreSQL did not become ready");
  vi.stubEnv("DATABASE_URL", databaseUrl);
  vi.stubEnv("APP_PASSWORD", "media-test-password");
  vi.stubEnv("SESSION_SECRET", "media-test-session-secret-at-least-32-characters");
  routes = await import("../app/api/links/route");
  routePool = (await import("../lib/db")).pool;
}, 60_000);

beforeEach(async () => {
  await db.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
  await db.query(legacySchema);
  lookup.mockReset().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  transport.mockReset().mockImplementation(async (url: string) => new Response(
    url.endsWith(".vtt") ? vtt : page(),
    { headers: { "content-type": url.endsWith(".vtt") ? "text/vtt" : "text/html" } },
  ));
  vi.stubGlobal("fetch", transport);
  vi.stubEnv("ALLOW_PRIVATE_URLS", "false");
});
afterAll(async () => {
  await routePool?.end();
  await db?.end();
  if (container) await exec("docker", ["rm", "-f", container]);
}, 30_000);

async function migrate() {
  return exec("npm", ["run", "migrate"], {
    env: { ...process.env, DATABASE_URL: databaseUrl, APP_PASSWORD: "media-test-password",
      SESSION_SECRET: "media-test-session-secret-at-least-32-characters" },
    timeout: 30_000,
  });
}
async function routeSchema() {
  // Supply only column shapes so route tests fail on missing API behavior, not SQL setup errors.
  // Deliberately retain the old generated vector: migration must upgrade it for AC6.
  await db.query(`ALTER TABLE links ADD COLUMN source TEXT, ADD COLUMN author TEXT,
    ADD COLUMN caption TEXT, ADD COLUMN transcript TEXT, ADD COLUMN mentioned_urls TEXT[] NOT NULL DEFAULT '{}'`);
  await migrate();
}
function post(body: Record<string, unknown>) {
  return routes.POST(new NextRequest("http://localhost/api/links", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }));
}
async function vectorIdentity() {
  const result = await db.query(`SELECT a.attnum, i.indexrelid::text AS index_oid,
    pg_get_expr(d.adbin, d.adrelid) AS expression, pg_get_indexdef(i.indexrelid) AS index_definition
    FROM pg_attribute a JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    JOIN pg_index i ON i.indrelid=a.attrelid
    JOIN pg_class c ON c.oid=i.indexrelid AND c.relname='links_search_vector_idx'
    WHERE a.attrelid='links'::regclass AND a.attname='search_vector' AND NOT a.attisdropped`);
  return result.rows[0];
}

test("AC5_migrate_twice: populated legacy links and tags survive with media defaults and a stable rebuilt GIN vector", async () => {
  const before = await vectorIdentity();

  await expect(migrate()).resolves.toMatchObject({ stdout: expect.stringContaining("Migration applied successfully") });
  const first = await vectorIdentity();
  await expect(migrate()).resolves.toMatchObject({ stdout: expect.stringContaining("Migration applied successfully") });
  const second = await vectorIdentity();
  const columns = await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='links'");
  expect(columns.rows.map((row) => row.column_name)).toEqual(expect.arrayContaining(["source", "author", "caption", "transcript", "mentioned_urls"]));
  const preserved = await db.query("SELECT l.title,l.notes,l.source,l.author,l.caption,l.transcript,l.mentioned_urls,t.name,t.color FROM links l JOIN link_tags lt ON lt.link_id=l.id JOIN tags t ON t.id=lt.tag_id WHERE l.id=1");
  expect(preserved.rows).toEqual([{ title: "Legacy title", notes: "Legacy notes", source: null, author: null,
    caption: null, transcript: null, mentioned_urls: [], name: "legacy-tag", color: "blue" }]);
  const nullable = await db.query("SELECT is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='links' AND column_name='mentioned_urls'");
  expect(nullable.rows).toEqual([{ is_nullable: "NO", column_default: "'{}'::text[]" }]);
  expect(first.expression).toContain("transcript");
  expect(first.attnum).not.toBe(before.attnum);
  expect(first.index_definition).toContain("USING gin (search_vector)");
  await db.query(`INSERT INTO links (url,title,description,notes,caption,author,transcript)
    VALUES ('https://vector.example/urlword','titleword','descword','notesword','captionword','authorword','transcriptword')`);
  const weights = await db.query(`SELECT
    search_vector @@ to_tsquery('english','titleword:A') AS title,
    search_vector @@ to_tsquery('english','descword:B & notesword:B & captionword:B') AS body,
    search_vector @@ to_tsquery('english','authorword:C') AS author,
    ts_filter(search_vector, '{C}') @@ plainto_tsquery('english','https://vector.example/urlword') AS url,
    search_vector @@ to_tsquery('english','transcriptword:D') AS transcript
    FROM links WHERE url='https://vector.example/urlword'`);
  expect(weights.rows).toEqual([{ title: true, body: true, author: true, url: true, transcript: true }]);

  expect(second).toEqual(first);
  expect((await db.query("SELECT count(*)::int AS count FROM link_tags")).rows).toEqual([{ count: 1 }]);
}, 60_000);

test.each([
  { field: "caption", word: "captionneedle" }, { field: "transcript", word: "transcriptneedle" },
])("AC6_search: a word only in $field returns the link and media fields", async ({ field, word }) => {
  await routeSchema();
  const inserted = await db.query(`INSERT INTO links (url,title,source,author,caption,transcript,mentioned_urls)
    VALUES ($1,'Video title','tiktok','creator',$2,$3,ARRAY['https://example.org/guide']) RETURNING id`,
    [videoUrl, field === "caption" ? word : "ordinary caption", field === "transcript" ? word : "ordinary transcript"]);

  const response = await routes.GET(new NextRequest(`http://localhost/api/links?q=${word}`));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body).toMatchObject({ matchCount: 1, hasMore: false, links: [{ id: inserted.rows[0].id,
    source: "tiktok", author: "creator", caption: field === "caption" ? word : "ordinary caption",
    transcript: field === "transcript" ? word : "ordinary transcript", mentioned_urls: ["https://example.org/guide"] }] });
  expect(body.links).toHaveLength(1);
});

test("AC7_backfill: repeated POST fills null media but keeps title, notes, tags and non-null empty URLs", async () => {
  await routeSchema();
  const inserted = await db.query("INSERT INTO links (url,title,notes,mentioned_urls) VALUES ($1,'Keep title','Keep notes','{}') RETURNING id", [videoUrl]);
  const id = inserted.rows[0].id;
  await db.query("INSERT INTO link_tags (link_id,tag_id) VALUES ($1,1)", [id]);

  const first = await post({ url: videoUrl, notes: "Do not replace", tags: ["new-tag"] });
  const second = await post({ url: videoUrl });

  expect(first.status).toBe(201);
  expect(second.status).toBe(201);
  expect(await first.json()).toEqual({ id });
  expect(await second.json()).toEqual({ id });
  const saved = await db.query("SELECT title,notes,source,author,caption,transcript,mentioned_urls FROM links WHERE id=$1", [id]);
  expect(saved.rows).toEqual([{ title: "Keep title", notes: "Keep notes", source: "tiktok", author: "creator", caption, transcript, mentioned_urls: [] }]);
  const tags = await db.query("SELECT t.name FROM tags t JOIN link_tags lt ON lt.tag_id=t.id WHERE lt.link_id=$1 ORDER BY t.name", [id]);
  expect(tags.rows).toEqual([{ name: "legacy-tag" }, { name: "new-tag" }]);
});

test("AC7_backfill: existing non-null media values are never overwritten", async () => {
  await routeSchema();
  await db.query(`INSERT INTO links (url,title,notes,source,author,caption,transcript,mentioned_urls)
    VALUES ($1,'Saved title','Saved notes','tiktok','saved-author','Saved caption','Saved transcript',ARRAY['https://saved.example/'])`, [videoUrl]);

  const response = await post({ url: videoUrl, notes: "replacement" });
  const saved = await db.query("SELECT title,notes,source,author,caption,transcript,mentioned_urls FROM links WHERE url=$1", [videoUrl]);

  expect(response.status).toBe(201);
  expect(saved.rows).toEqual([{ title: "Saved title", notes: "Saved notes", source: "tiktok", author: "saved-author",
    caption: "Saved caption", transcript: "Saved transcript", mentioned_urls: ["https://saved.example/"] }]);
});

test("AC7_backfill: concurrent first saves insert media and yield one ID", async () => {
  await routeSchema();

  const [first, second] = await Promise.all([
    post({ url: videoUrl, notes: "Keep notes" }), post({ url: videoUrl, notes: "Keep notes" }),
  ]);
  const firstBody = await first.json();
  const secondBody = await second.json();

  expect(first.status).toBe(201);
  expect(second.status).toBe(201);
  expect(firstBody.id).toEqual(expect.any(Number));
  expect(secondBody).toEqual(firstBody);
  expect((await db.query("SELECT count(*)::int AS count FROM links WHERE url=$1", [videoUrl])).rows).toEqual([{ count: 1 }]);
  expect((await db.query("SELECT source,author,caption,transcript,mentioned_urls,title,notes FROM links WHERE id=$1", [firstBody.id])).rows).toEqual([
    { source: "tiktok", author: "creator", caption, transcript,
      mentioned_urls: ["https://example.org/guide", "https://docs.example.org/start"], title: "Video title", notes: "Keep notes" },
  ]);
});

test("AC3_save_failure: failed extraction saves a labelled TikTok within ten seconds", async () => {
  await routeSchema();
  transport.mockRejectedValue(new Error("Transport unavailable"));
  const start = performance.now();

  const response = await post({ url: videoUrl, notes: "Keep me" });
  const elapsed = performance.now() - start;

  expect(response.status).toBe(201);
  expect(elapsed).toBeLessThan(10_000);
  expect((await db.query("SELECT source,author,caption,transcript,mentioned_urls,notes FROM links WHERE url=$1", [videoUrl])).rows).toEqual([
    { source: "tiktok", author: null, caption: null, transcript: null, mentioned_urls: [], notes: "Keep me" },
  ]);
}, 15_000);
