import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { safeFetch } from "@/lib/safeFetch";

const CHECK_TIMEOUT_MS = 8000;
const CONCURRENCY = 5;

interface CheckResult {
  id: number;
  ok: boolean;
  status: number | null;
}

async function checkUrl(url: string): Promise<{ ok: boolean; status: number | null }> {
  try {
    let res = await safeFetch(url, {
      method: "HEAD",
      timeoutMs: CHECK_TIMEOUT_MS,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Indexio/1.0)" },
    });
    // Some servers don't support HEAD; GET must enforce the same destination policy.
    if (res.status === 405 || res.status === 501) {
      res = await safeFetch(url, {
        method: "GET",
        timeoutMs: CHECK_TIMEOUT_MS,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Indexio/1.0)" },
      });
    }
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: null };
  }
}

export async function POST() {
  const result = await pool.query<{ id: number; url: string }>(
    `SELECT id, url FROM links ORDER BY id`
  );
  const links = result.rows;

  const results: CheckResult[] = [];
  for (let i = 0; i < links.length; i += CONCURRENCY) {
    const batch = links.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (link) => {
        const { ok, status } = await checkUrl(link.url);
        return { id: link.id, ok, status };
      })
    );
    results.push(...batchResults);
  }

  return NextResponse.json({
    results,
    brokenCount: results.filter((r) => !r.ok).length,
  });
}
