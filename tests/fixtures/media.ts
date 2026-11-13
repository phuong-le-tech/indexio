export const videoUrl = "https://www.tiktok.com/@creator/video/123";
export const subtitleUrl = "https://subtitles.example.org/english.vtt";
export const caption = "Read https://example.org/guide and https://example.org/guide";
export const transcript = "Hello world.\nVisit https://docs.example.org/start";
export const vtt = `WEBVTT

NOTE not spoken
fixture note

1
00:00:00.000 --> 00:00:01.000 align:start
<v Creator>Hello <b>world.</b></v>

2
00:00:01.000 --> 00:00:03.000
Visit https://docs.example.org/start
`;
export const item = {
  desc: caption,
  author: { uniqueId: "creator" },
  video: { cover: "https://images.example.org/cover.jpg", subtitleInfos: [{ LanguageCodeName: "eng-US", Url: subtitleUrl }] },
};
export function page(struct: unknown = item, ogImage = true): string {
  return `<html><head><meta property="og:title" content="Video title"><meta property="og:description" content="OG description">${ogImage ? '<meta property="og:image" content="https://images.example.org/og.jpg">' : ""}</head><body><script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${JSON.stringify({ __DEFAULT_SCOPE__: { "webapp.video-detail": { itemInfo: { itemStruct: struct } } } })}</script></body></html>`;
}
export const emptyMedia = { source: "tiktok", author: null, caption: null, transcript: null, mentioned_urls: [] };
