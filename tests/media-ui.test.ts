import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { expect, test } from "vitest";
import { LinkList } from "@/components/link-list/LinkList";
import type { Link } from "@/lib/types";

type MediaLink = Link & {
  source: "tiktok" | "instagram" | null;
  author: string | null;
  caption: string | null;
  transcript: string | null;
  mentioned_urls: string[];
};
const ordinaryLink: MediaLink = {
  id: 1, url: "https://example.com/article", title: "An ordinary article",
  description: "Original description", favicon_url: null, image_url: null,
  notes: "My saved note", created_at: "2026-11-01T12:00:00.000Z", tags: ["reading"],
  source: null, author: null, caption: null, transcript: null, mentioned_urls: [],
};
function tiktok(overrides: Partial<MediaLink> = {}): MediaLink {
  return { ...ordinaryLink, url: "https://www.tiktok.com/@creator/video/123", source: "tiktok",
    author: "creator", caption: "Useful caption", ...overrides };
}
function renderCard(link: Link) {
  const html = renderToStaticMarkup(createElement(LinkList, {
    links: [link], availableTags: [], onUpdate: () => {}, onDeleted: () => {},
  }));
  return { html, $: load(html) };
}
function elementsWithText($: ReturnType<typeof load>, text: string) {
  return $("li *").filter((_, element) => $(element).children().length === 0 && $(element).text() === text);
}

test("AC8_cards: hostile caption renders as escaped text", () => {
  const caption = '<script>alert("caption")</script><img src=x onerror="alert(1)"> & text';
  const { html, $ } = renderCard(tiktok({ caption }));

  expect(elementsWithText($, caption)).toHaveLength(1);
  expect($("li script, li img[onerror]")).toHaveLength(0);
  expect(html).toContain("&lt;script&gt;");
});
test.each([
  { source: "tiktok" as const, label: "TikTok", url: "https://www.tiktok.com/@creator/video/123" },
  { source: "instagram" as const, label: "Instagram", url: "https://www.instagram.com/reel/ABC/" },
])("AC8_cards: $source has a platform badge", ({ source, label, url }) => {
  const { $ } = renderCard(tiktok({ source, url }));

  expect(elementsWithText($, label)).toHaveLength(1);
});
test("AC8_cards: author is displayed with an @ prefix", () => {
  const { $ } = renderCard(tiktok());

  expect(elementsWithText($, "@creator")).toHaveLength(1);
});
test("AC8_cards: caption preview is clamped to three lines", () => {
  const caption = "First line\nSecond line\nThird line\nFourth line";
  const { $ } = renderCard(tiktok({ caption }));

  expect(elementsWithText($, caption).hasClass("line-clamp-3")).toBe(true);
});
test.each(["https://example.org/resource", "https://docs.example.org/guide?q=one&lang=en"])(
  "AC8_cards: mentioned URL has safe anchor attributes: %s", (url) => {
    const { $ } = renderCard(tiktok({ mentioned_urls: [url] }));
    const anchor = $("li a").filter((_, element) => $(element).attr("href") === url);

    expect(elementsWithText($, "Links mentioned")).toHaveLength(1);
    expect(anchor).toHaveLength(1);
    expect(anchor.attr("target")).toBe("_blank");
    expect(anchor.attr("rel")).toBe("noopener noreferrer nofollow");
  },
);
test("AC8_cards: missing Instagram caption is labelled honestly", () => {
  const { $ } = renderCard(tiktok({ source: "instagram", url: "https://www.instagram.com/reel/ABC/", caption: null, author: null }));

  expect(elementsWithText($, "Caption not available")).toHaveLength(1);
});
test("AC8_cards: ordinary card retains its existing content and link", () => {
  const { $ } = renderCard(ordinaryLink);
  const anchor = $("li a");

  expect($('ul[aria-label="Saved links"] > li')).toHaveLength(1);
  expect($("li").text()).toContain("An ordinary article");
  expect($("li").text()).toContain("Original description");
  expect($("li").text()).toContain("My saved note");
  expect(elementsWithText($, "reading")).toHaveLength(1);
  expect(anchor).toHaveLength(1);
  expect(anchor.attr("href")).toBe(ordinaryLink.url);
  expect(anchor.attr("rel")).toBe("noopener noreferrer");
  expect(elementsWithText($, "Original description").hasClass("line-clamp-2")).toBe(true);
  expect($("li").text()).not.toMatch(/TikTok|Instagram|Caption not available|Links mentioned/);
});
