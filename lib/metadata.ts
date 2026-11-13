import * as cheerio from "cheerio";
import { safeFetch } from "./safeFetch";

export interface LinkMetadata {
  title: string | null;
  description: string | null;
  faviconUrl: string | null;
  imageUrl: string | null;
}

function resolveUrl(base: string, maybeRelative: string | undefined) {
  if (!maybeRelative) return null;
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

export async function fetchMetadata(url: string): Promise<LinkMetadata> {
  const empty: LinkMetadata = {
    title: null,
    description: null,
    faviconUrl: null,
    imageUrl: null,
  };

  try {
    const res = await safeFetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Indexio/1.0)" },
    });
    if (!res.ok) return empty;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return empty;

    return parseMetadata(url, cheerio.load(await res.text()));
  } catch {
    return empty;
  }
}

export function parseMetadata(url: string, $: cheerio.CheerioAPI): LinkMetadata {
  const title =
    $('meta[property="og:title"]').attr("content") ||
    $("title").first().text() ||
    null;

  const description =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    null;

  const image = resolveUrl(url, $('meta[property="og:image"]').attr("content"));

  const favicon =
    resolveUrl(url, $('link[rel="icon"]').attr("href")) ||
    resolveUrl(url, $('link[rel="shortcut icon"]').attr("href")) ||
    resolveUrl(url, "/favicon.ico");

  return {
    title: title?.trim() || null,
    description: description?.trim() || null,
    faviconUrl: favicon,
    imageUrl: image,
  };
}
