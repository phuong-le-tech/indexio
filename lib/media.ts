import type { LinkMetadata } from "./metadata";

export type MediaSource = "tiktok" | "instagram" | null;
export interface MediaMetadata extends LinkMetadata {
  source: MediaSource;
  author: string | null;
  caption: string | null;
  transcript: string | null;
  mentioned_urls: string[];
}

export function detectSource(url: string): MediaSource {
  void url;
  throw new Error("Not implemented: detectSource");
}

export async function fetchMediaMetadata(url: string): Promise<MediaMetadata> {
  void url;
  throw new Error("Not implemented: fetchMediaMetadata");
}
