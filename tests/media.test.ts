import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { detectSource, fetchMediaMetadata } from "../lib/media";
import { caption, emptyMedia, item, page, subtitleUrl, transcript, videoUrl, vtt } from "./fixtures/media";

const { lookup, transport } = vi.hoisted(() => ({ lookup: vi.fn(), transport: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup }));
const html = (body: string, status = 200) => new Response(body, { status, headers: { "content-type": "text/html" } });
const subtitles = (body = vtt, status = 200) => new Response(body, { status, headers: { "content-type": "text/vtt" } });

beforeEach(() => {
  lookup.mockReset().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  transport.mockReset().mockImplementation(async () => html(page({ ...item, video: {} })));
  vi.stubGlobal("fetch", transport);
  vi.stubEnv("ALLOW_PRIVATE_URLS", "false");
});
afterEach(() => vi.useRealTimers());

test.each([
  ["https://tiktok.com/@a/video/1", "tiktok"], ["https://www.tiktok.com/@a/video/1", "tiktok"],
  ["https://vm.tiktok.com/abc/", "tiktok"], ["https://m.tiktok.com/abc", "tiktok"],
  ["https://instagram.com/p/abc/", "instagram"], ["https://www.instagram.com/reel/abc/", "instagram"],
  ["https://m.instagram.com/p/abc/", "instagram"], ["https://vm.instagram.com/p/abc/", "instagram"],
  ["", null], ["not a URL", null], ["tiktok.com", null], ["https://example.com", null],
  ["https://tiktok.com.evil.example/a", null], ["https://eviltiktok.com/a", null],
  ["https://tiktok.com@evil.example/a", null], ["https://example.com/?url=https://tiktok.com", null],
  ["javascript:alert(1)", null],
])("AC1_hosts: %s -> %s", (url, source) => {
  expect(() => detectSource(url!)).not.toThrow();
  expect(detectSource(url!)).toBe(source);
});

test("AC2_fixture: caption, author, plain VTT and deduplicated URLs are extracted", async () => {
  transport.mockResolvedValueOnce(html(page())).mockResolvedValueOnce(subtitles());

  await expect(fetchMediaMetadata(videoUrl)).resolves.toEqual({
    title: "Video title", description: "OG description", faviconUrl: "https://www.tiktok.com/favicon.ico",
    imageUrl: "https://images.example.org/og.jpg", source: "tiktok", author: "creator", caption, transcript,
    mentioned_urls: ["https://example.org/guide", "https://docs.example.org/start"],
  });
  expect(transport).toHaveBeenCalledTimes(2);
  expect(transport).toHaveBeenNthCalledWith(1, videoUrl, expect.objectContaining({
    headers: expect.objectContaining({ "User-Agent": expect.stringContaining("Mozilla") }),
  }));
  expect(transport).toHaveBeenNthCalledWith(2, subtitleUrl, expect.anything());
});

test.each(["eng-US", "fra-FR"])("AC2_fixture: %s subtitle is preferred over another language", async (language) => {
  transport.mockResolvedValueOnce(html(page({ ...item, video: { subtitleInfos: [
    { LanguageCodeName: "spa-ES", Url: "https://subtitles.example.org/spanish.vtt" },
    { LanguageCodeName: language, Url: subtitleUrl },
  ] } }))).mockResolvedValueOnce(subtitles());

  await expect(fetchMediaMetadata(videoUrl)).resolves.toMatchObject({ transcript });
  expect(transport).toHaveBeenNthCalledWith(2, subtitleUrl, expect.anything());
});

test("AC2_fixture: video cover is used only when the OG image is absent", async () => {
  transport.mockResolvedValueOnce(html(page({ ...item, video: { cover: item.video.cover } }, false)));

  await expect(fetchMediaMetadata(videoUrl)).resolves.toMatchObject({ imageUrl: item.video.cover, caption });
  expect(transport).toHaveBeenCalledTimes(1);
});

test.each([undefined, null, {}, { desc: null, author: null, video: null }, { desc: 42, author: { uniqueId: {} }, video: { cover: [] } }])(
  "AC2_boundaries: absent or wrong-type item fields resolve safely: %j", async (struct) => {
    // Explicit undefined must represent an absent itemStruct, not page()'s default.
    const body = `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">${JSON.stringify({ __DEFAULT_SCOPE__: { "webapp.video-detail": { itemInfo: { itemStruct: struct } } } })}</script>`;
    transport.mockResolvedValueOnce(html(body));

    await expect(fetchMediaMetadata(videoUrl)).resolves.toMatchObject(emptyMedia);
  },
);
const urls20 = Array.from({ length: 20 }, (_, index) => `https://example.org/${index}`);
test.each([
  { label: "zero", text: "no links", expected: [] },
  { label: "one deduplicated", text: "https://example.org/0 https://example.org/0", expected: ["https://example.org/0"] },
  { label: "twenty", text: urls20.join(" "), expected: urls20 },
  { label: "twenty-one capped", text: [...urls20, "https://example.org/20"].join(" "), expected: urls20 },
])("AC2_boundaries: mentioned URLs $label", async ({ text, expected }) => {
  transport.mockResolvedValueOnce(html(page({ desc: text })));

  await expect(fetchMediaMetadata(videoUrl)).resolves.toMatchObject({ caption: text, mentioned_urls: expected });
});

test.each([
  { name: "missing script", response: () => html("<title>Video</title>") },
  { name: "bad JSON", response: () => html('<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">{broken</script>') },
  { name: "non-200", response: () => html(page(), 503) },
  { name: "non-HTML", response: () => new Response(page(), { headers: { "content-type": "application/json" } }) },
  { name: "declared oversize", response: () => new Response(page(), { headers: { "content-type": "text/html", "content-length": "2097153" } }) },
  { name: "streamed oversize", response: () => html(page().padEnd(2097153, " ")) },
])("AC3_failures: $name resolves null extracted fields without throwing", async ({ response }) => {
  transport.mockResolvedValueOnce(response());

  await expect(fetchMediaMetadata(videoUrl)).resolves.toMatchObject(emptyMedia);
});
test("AC3_failures: DNS failure resolves empty extraction", async () => {
  lookup.mockRejectedValueOnce(new Error("DNS unavailable"));

  await expect(fetchMediaMetadata(videoUrl)).resolves.toMatchObject(emptyMedia);
  expect(transport).not.toHaveBeenCalled();
});
test("AC3_failures: exact 2 MiB page is accepted", async () => {
  transport.mockResolvedValueOnce(html(page({ desc: caption }).padEnd(2097152, " ")));

  await expect(fetchMediaMetadata(videoUrl)).resolves.toMatchObject({ caption });
});
test("AC3_failures: page fetch is aborted at five seconds", async () => {
  vi.useFakeTimers();
  transport.mockImplementation(() => new Promise<Response>(() => {}));
  const result = fetchMediaMetadata(videoUrl).catch((error: unknown) => error);

  await vi.advanceTimersByTimeAsync(5000);

  await expect(result).resolves.toMatchObject(emptyMedia);
  expect(transport.mock.calls[0]?.[1].signal.aborted).toBe(true);
});

test.each([
  { label: "absent", subtitleInfos: undefined }, { label: "empty", subtitleInfos: [] },
  { label: "null", subtitleInfos: null }, { label: "wrong type", subtitleInfos: "invalid" },
  { label: "null entry", subtitleInfos: [null] }, { label: "numeric URL", subtitleInfos: [{ Url: 4 }] },
  { label: "empty URL", subtitleInfos: [{ Url: "" }] },
])(
  "AC4_subtitles: $label subtitle info preserves caption", async ({ subtitleInfos }) => {
    transport.mockResolvedValueOnce(html(page({ ...item, video: { subtitleInfos } })));

    await expect(fetchMediaMetadata(videoUrl)).resolves.toMatchObject({ caption, transcript: null });
    expect(transport).toHaveBeenCalledTimes(1);
  },
);
test.each([
  { name: "non-200", response: () => subtitles("unavailable", 403) },
  { name: "malformed VTT", response: () => subtitles("not a subtitle document") },
  { name: "empty VTT", response: () => subtitles("") },
  { name: "declared oversized", response: () => new Response(vtt, { headers: { "content-length": "524289" } }) },
  { name: "streamed oversized", response: () => subtitles(vtt.padEnd(524289, " ")) },
  { name: "redirect to private host", response: () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/private.vtt" } }) },
])("AC4_subtitles: $name preserves caption and nulls transcript", async ({ response }) => {
  transport.mockResolvedValueOnce(html(page())).mockResolvedValueOnce(response());

  await expect(fetchMediaMetadata(videoUrl)).resolves.toMatchObject({ caption, transcript: null, mentioned_urls: ["https://example.org/guide"] });
  expect(transport).toHaveBeenCalledTimes(2);
});
test("AC4_subtitles: direct private subtitle URL is blocked", async () => {
  transport.mockResolvedValueOnce(html(page({ ...item, video: { subtitleInfos: [{ Url: "http://127.0.0.1/private.vtt" }] } })));

  await expect(fetchMediaMetadata(videoUrl)).resolves.toMatchObject({ caption, transcript: null });
  expect(transport).toHaveBeenCalledTimes(1);
});
test("AC4_subtitles: public redirect is followed safely", async () => {
  transport.mockResolvedValueOnce(html(page()))
    .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/redirected.vtt" } }))
    .mockResolvedValueOnce(subtitles());

  await expect(fetchMediaMetadata(videoUrl)).resolves.toMatchObject({ caption, transcript });
  expect(transport).toHaveBeenNthCalledWith(3, "https://subtitles.example.org/redirected.vtt", expect.anything());
});
test("AC4_subtitles: exact 512 KiB VTT is accepted", async () => {
  const body = vtt + "\nNOTE padding\n";
  transport.mockResolvedValueOnce(html(page())).mockResolvedValueOnce(subtitles(body.padEnd(524288, " ")));

  await expect(fetchMediaMetadata(videoUrl)).resolves.toMatchObject({ caption, transcript });
});
test("AC4_subtitles: fetch is aborted at four seconds and keeps caption", async () => {
  vi.useFakeTimers();
  transport.mockResolvedValueOnce(html(page())).mockImplementationOnce(() => new Promise<Response>(() => {}));
  const result = fetchMediaMetadata(videoUrl).catch((error: unknown) => error);

  await vi.advanceTimersByTimeAsync(4000);

  await expect(result).resolves.toMatchObject({ caption, transcript: null });
  expect(transport.mock.calls[1]?.[1].signal.aborted).toBe(true);
});
test("AC8_urls: only HTTP and HTTPS URLs from caption and transcript are retained", async () => {
  transport.mockResolvedValueOnce(html(page({ ...item, desc: "javascript:alert(1) data:text/html,x http://example.org/a https://example.org/b" })))
    .mockResolvedValueOnce(subtitles("WEBVTT\n\n00:00:00.000 --> 00:00:01.000\njavascript:alert(2) data:text/plain,x https://example.org/b https://example.org/c\n"));

  await expect(fetchMediaMetadata(videoUrl)).resolves.toMatchObject({ mentioned_urls: ["http://example.org/a", "https://example.org/b", "https://example.org/c"] });
});
