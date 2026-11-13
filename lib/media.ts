import * as cheerio from "cheerio";
import { fetchMetadata, parseMetadata, type LinkMetadata } from "./metadata";
import { safeFetch } from "./safeFetch";

export type MediaSource = "tiktok" | "instagram" | null;
export interface MediaMetadata extends LinkMetadata {
  source: MediaSource;
  author: string | null;
  caption: string | null;
  transcript: string | null;
  mentioned_urls: string[];
}

const PAGE_TIMEOUT_MS = 5000;
const PAGE_MAX_BYTES = 2 * 1024 * 1024;
const SUBTITLE_TIMEOUT_MS = 4000;
const SUBTITLE_MAX_BYTES = 512 * 1024;
const MAX_MENTIONED_URLS = 20;
const BROWSER_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; Indexio/1.0)" };

export function detectSource(url: string): MediaSource {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    const host = parsed.hostname.replace(/^(www|vm|m)\./, "");
    if (host === "tiktok.com") return "tiktok";
    if (host === "instagram.com") return "instagram";
  } catch {
    // Invalid input is not a supported media source.
  }
  return null;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

function mentionedUrls(caption: string | null, transcript: string | null): string[] {
  const urls = new Set<string>();
  for (const match of `${caption ?? ""}\n${transcript ?? ""}`.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    const candidate = match[0].replace(/[.,!?;:)]+$/, "");
    try {
      const url = new URL(candidate);
      if (url.protocol === "http:" || url.protocol === "https:") urls.add(candidate);
    } catch {
      // Captions can contain incomplete URLs.
    }
    if (urls.size === MAX_MENTIONED_URLS) break;
  }
  return [...urls];
}

function parseVtt(body: string): string | null {
  const normalized = body.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!/^WEBVTT(?:[ \t].*)?(?:\n|$)/.test(normalized)) return null;
  const cues: string[] = [];
  for (const block of normalized.split(/\n[ \t]*\n/).slice(1)) {
    if (/^(NOTE(?:\s|$)|STYLE(?:\s|$)|REGION(?:\s|$))/.test(block)) continue;
    const lines = block.split("\n");
    const timing = lines.findIndex((line) => /^(?:\d{2,}:)?\d{2}:\d{2}\.\d{3}\s+-->\s+(?:\d{2,}:)?\d{2}:\d{2}\.\d{3}(?:\s|$)/.test(line));
    if (timing < 0 || timing > 1) continue;
    const cue = cheerio.load(lines.slice(timing + 1).join("\n"), null, false).text().trim();
    if (cue) cues.push(cue);
  }
  return cues.join("\n") || null;
}

async function fetchTranscript(subtitleInfos: unknown): Promise<string | null> {
  if (!Array.isArray(subtitleInfos)) return null;
  const subtitles = subtitleInfos.map(record).filter((entry) => text(entry.Url));
  const subtitle = subtitles.find((entry) => /^(eng|fra)(?:-|$)/i.test(text(entry.LanguageCodeName) ?? "")) ?? subtitles[0];
  const url = text(subtitle?.Url);
  if (!url) return null;
  try {
    const response = await safeFetch(url, { timeoutMs: SUBTITLE_TIMEOUT_MS, maxBytes: SUBTITLE_MAX_BYTES });
    return response.ok ? parseVtt(await response.text()) : null;
  } catch {
    // Subtitle failure must not discard the successfully extracted caption.
    return null;
  }
}

export async function fetchMediaMetadata(url: string): Promise<MediaMetadata> {
  const source = detectSource(url);
  const result: MediaMetadata = {
    title: null, description: null, faviconUrl: null, imageUrl: null,
    source, author: null, caption: null, transcript: null, mentioned_urls: [],
  };
  try {
    if (source !== "tiktok") return { ...result, ...await fetchMetadata(url) };
    const response = await safeFetch(url, {
      headers: BROWSER_HEADERS, timeoutMs: PAGE_TIMEOUT_MS, maxBytes: PAGE_MAX_BYTES,
    });
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return result;
    const $ = cheerio.load(await response.text());
    Object.assign(result, parseMetadata(url, $));
    const script = $("#__UNIVERSAL_DATA_FOR_REHYDRATION__").text();
    if (!script) return result;
    const data: unknown = JSON.parse(script);
    const scope = record(record(data).__DEFAULT_SCOPE__);
    const info = record(record(scope["webapp.video-detail"]).itemInfo);
    const item = record(info.itemStruct);
    const video = record(item.video);
    result.caption = text(item.desc);
    result.author = text(record(item.author).uniqueId);
    result.imageUrl ??= text(video.cover);
    result.transcript = await fetchTranscript(video.subtitleInfos);
    result.mentioned_urls = mentionedUrls(result.caption, result.transcript);
  } catch {
    // Page/network/markup failures leave the link saveable with null media fields.
  }
  return result;
}
