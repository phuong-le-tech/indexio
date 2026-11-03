import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { safeFetch } from "../lib/safeFetch";
import { fetchMetadata } from "../lib/metadata";

const { lookup, transport } = vi.hoisted(() => ({ lookup: vi.fn(), transport: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup }));

// API: safeFetch(url, { maxBytes?, timeoutMs?, ...RequestInit }) -> Response.
// DNS uses lookup(host, { all: true }); HTTP uses global fetch with manual redirects.
// Defaults: 5 redirect transitions, 2 MiB body, 5s timeout; ALLOW_PRIVATE_URLS=true
// is the only private-address opt-out. Enforce byte limits while streaming, before
// returning a reusable Response. Error categories below are public helper contracts.
beforeEach(() => {
  lookup.mockReset().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  transport.mockReset().mockResolvedValue(new Response("ok"));
  vi.stubGlobal("fetch", transport);
  vi.stubEnv("ALLOW_PRIVATE_URLS", "false");
});
afterEach(() => vi.useRealTimers());

test.each([
  "0.0.0.0", "0.1.2.3", "10.0.0.0", "10.255.255.255",
  "127.0.0.1", "127.255.255.255", "169.254.0.0", "169.254.169.254", "169.254.255.255",
  "172.16.0.0", "172.31.255.255", "192.168.0.0", "192.168.255.255",
  "::", "::1", "fe80::1", "febf:ffff::1", "fc00::1", "fdff:ffff::1",
  "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:10.0.0.1", "::ffff:c0a8:101",
])("AC5_address_policy_blocks_DNS_answer_before_transport: %s", async (address) => {
  lookup.mockResolvedValue([{ address, family: address.includes(":") ? 6 : 4 }]);

  await expect(safeFetch("https://example.test/")).rejects.toThrow(/Blocked address/);
  expect(transport).not.toHaveBeenCalled();
});

test.each([
  "http://127.0.0.1/", "http://10.1.2.3/", "http://192.168.1.1/",
  "http://169.254.169.254/", "http://[::1]/", "http://[::]/",
  "http://[::ffff:127.0.0.1]/", "http://2130706433/", "http://0x7f000001/",
])("AC5_address_policy_blocks_literal_URL: %s", async (url) => {
  await expect(safeFetch(url)).rejects.toThrow(/Blocked address/);
  expect(transport).not.toHaveBeenCalled();
});

test("AC5_address_policy_blocks_localhost", async () => {
  lookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);

  await expect(safeFetch("http://localhost/")).rejects.toThrow(/Blocked address/);
  expect(transport).not.toHaveBeenCalled();
});

test("AC5_address_policy_blocks_mixed_public_private_answers", async () => {
  lookup.mockResolvedValue([
    { address: "93.184.216.34", family: 4 }, { address: "::1", family: 6 },
  ]);

  await expect(safeFetch("https://example.test/")).rejects.toThrow(/Blocked address/);
  expect(transport).not.toHaveBeenCalled();
});

test.each([
  "9.255.255.255", "11.0.0.0", "172.15.255.255", "172.32.0.0",
  "192.167.255.255", "192.169.0.0", "169.253.255.255", "169.255.0.0",
  "93.184.216.34", "2606:4700:4700::1111", "::ffff:5db8:d822",
])("AC5_address_policy_accepts_public_boundary: %s", async (address) => {
  lookup.mockResolvedValue([{ address, family: address.includes(":") ? 6 : 4 }]);

  const result = safeFetch("https://example.test/");
  await expect(result).resolves.toMatchObject({ status: 200 });
  const response = await result;

  expect(await response.text()).toBe("ok");
  expect(lookup).toHaveBeenCalledWith("example.test", { all: true });
  expect(transport).toHaveBeenCalledExactlyOnceWith("https://example.test/", expect.objectContaining({ redirect: "manual" }));
});

test.each([undefined, "false"])("AC5_address_policy_default_is_blocked: %s", async (value) => {
  vi.stubEnv("ALLOW_PRIVATE_URLS", value);
  lookup.mockResolvedValue([{ address: "10.1.2.3", family: 4 }]);

  await expect(safeFetch("http://lan.test/")).rejects.toThrow(/Blocked address/);
  expect(transport).not.toHaveBeenCalled();
});

test("AC5_address_policy_explicit_opt_out_permits_private", async () => {
  vi.stubEnv("ALLOW_PRIVATE_URLS", "true");
  lookup.mockResolvedValue([{ address: "10.1.2.3", family: 4 }]);

  const result = safeFetch("http://lan.test/");
  await expect(result).resolves.toMatchObject({ status: 200 });
  const response = await result;

  expect(await response.text()).toBe("ok");
});

test.each(["file:///etc/passwd", "ftp://example.test/a", "data:text/plain,hello"])(
  "AC5_address_policy_opt_out_never_permits_non_HTTP: %s", async (url) => {
    vi.stubEnv("ALLOW_PRIVATE_URLS", "true");

    await expect(safeFetch(url)).rejects.toThrow(/Unsupported protocol/);
    expect(transport).not.toHaveBeenCalled();
  },
);

test("AC5_address_policy_DNS_failure_never_reaches_transport", async () => {
  lookup.mockRejectedValue(new Error("DNS unavailable"));

  await expect(safeFetch("https://example.test/")).rejects.toThrow("DNS unavailable");
  expect(transport).not.toHaveBeenCalled();
});

test("AC5_address_policy_empty_DNS_result_is_refused", async () => {
  lookup.mockResolvedValue([]);

  await expect(safeFetch("https://example.test/")).rejects.toThrow(/DNS/);
  expect(transport).not.toHaveBeenCalled();
});

test("AC6_redirect_relative_hop_is_resolved_and_revalidated", async () => {
  transport.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/next" } }));

  const result = safeFetch("https://example.test/start");
  await expect(result).resolves.toMatchObject({ status: 200 });
  const response = await result;

  expect(await response.text()).toBe("ok");
  expect(lookup).toHaveBeenCalledTimes(2);
  expect(transport).toHaveBeenNthCalledWith(2, "https://example.test/next", expect.objectContaining({ redirect: "manual" }));
});

test("AC6_redirect_private_hop_is_blocked_before_second_transport", async () => {
  transport.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "http://lan.test/" } }));
  lookup.mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }])
    .mockResolvedValueOnce([{ address: "10.0.0.1", family: 4 }]);

  await expect(safeFetch("https://example.test/")).rejects.toThrow(/Blocked address/);
  expect(transport).toHaveBeenCalledTimes(1);
});

test("AC6_redirect_non_HTTP_target_is_blocked", async () => {
  transport.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "file:///etc/passwd" } }));

  await expect(safeFetch("https://example.test/")).rejects.toThrow(/Unsupported protocol/);
  expect(transport).toHaveBeenCalledTimes(1);
});

test("AC6_redirect_five_transitions_succeed", async () => {
  transport.mockReset();
  transport.mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: "/1" } }))
    .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/2" } }))
    .mockResolvedValueOnce(new Response(null, { status: 303, headers: { location: "/3" } }))
    .mockResolvedValueOnce(new Response(null, { status: 307, headers: { location: "/4" } }))
    .mockResolvedValueOnce(new Response(null, { status: 308, headers: { location: "/5" } }))
    .mockResolvedValueOnce(new Response("done"));

  const result = safeFetch("https://example.test/0");
  await expect(result).resolves.toMatchObject({ status: 200 });
  const response = await result;

  expect(await response.text()).toBe("done");
  expect(transport).toHaveBeenCalledTimes(6);
});

test("AC6_redirect_sixth_transition_is_rejected", async () => {
  transport.mockReset();
  transport.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/1" } }))
    .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/2" } }))
    .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/3" } }))
    .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/4" } }))
    .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/5" } }))
    .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/6" } }));

  await expect(safeFetch("https://example.test/0")).rejects.toThrow(/redirect/i);
  expect(transport).toHaveBeenCalledTimes(6);
});

test("AC6_redirect_loop_is_bounded", async () => {
  transport.mockImplementation(async () => new Response(null, { status: 302, headers: { location: "/" } }));

  await expect(safeFetch("https://example.test/")).rejects.toThrow(/redirect/i);
  expect(transport.mock.calls.length).toBeLessThanOrEqual(6);
});

test("AC6_body_exact_byte_cap_is_accepted", async () => {
  transport.mockResolvedValue(new Response("éé", { headers: { "content-length": "4" } }));

  const result = safeFetch("https://example.test/", { maxBytes: 4 });
  await expect(result).resolves.toMatchObject({ status: 200 });
  const response = await result;

  expect(await response.text()).toBe("éé");
});

test("AC6_body_declared_cap_plus_one_is_rejected_without_reading", async () => {
  const body = new ReadableStream<Uint8Array>({ pull: vi.fn() }, { highWaterMark: 0 });
  const cancel = vi.spyOn(body, "cancel");
  transport.mockResolvedValue(new Response(body, { headers: { "content-length": "5" } }));

  await expect(safeFetch("https://example.test/", { maxBytes: 4 })).rejects.toThrow(/size/i);
  expect(cancel).toHaveBeenCalled();
});

test("AC6_body_streaming_cap_plus_one_cancels_unread_remainder", async () => {
  const cancel = vi.fn();
  const pull = vi.fn()
    .mockImplementationOnce((controller: ReadableStreamDefaultController<Uint8Array>) => controller.enqueue(new TextEncoder().encode("1234")))
    .mockImplementationOnce((controller: ReadableStreamDefaultController<Uint8Array>) => controller.enqueue(new TextEncoder().encode("5")))
    .mockImplementationOnce((controller: ReadableStreamDefaultController<Uint8Array>) => controller.enqueue(new TextEncoder().encode("must not read")));
  const body = new ReadableStream<Uint8Array>({ pull, cancel }, { highWaterMark: 0 });
  transport.mockResolvedValue(new Response(body));

  await expect(safeFetch("https://example.test/", { maxBytes: 4 })).rejects.toThrow(/size/i);
  expect(cancel).toHaveBeenCalledOnce();
  expect(pull).toHaveBeenCalledTimes(2);
});

test("AC6_timeout_aborts_pending_transport", async () => {
  vi.useFakeTimers();
  let signal: AbortSignal | undefined;
  transport.mockImplementation((_url: string, init: RequestInit) => {
    signal = init.signal!;
    return new Promise<Response>((_resolve, reject) => {
      signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    });
  });

  const result = safeFetch("https://example.test/", { timeoutMs: 50 }).catch((error: unknown) => error);
  await vi.advanceTimersByTimeAsync(50);

  expect(await result).toMatchObject({ name: "AbortError" });
  expect(signal?.aborted).toBe(true);
});

const emptyMetadata = { title: null, description: null, faviconUrl: null, imageUrl: null };

test.each([
  { name: "non-HTML", response: () => new Response("text", { headers: { "content-type": "text/plain" } }) },
  { name: "non-2xx", response: () => new Response("<title>Error</title>", { status: 500, headers: { "content-type": "text/html" } }) },
])("AC5_metadata_fallback: $name", async ({ response }) => {
  transport.mockResolvedValue(response());

  expect(await fetchMetadata("https://example.test/")).toEqual(emptyMetadata);
});

test("AC5_metadata_private_destination_is_empty_without_transport", async () => {
  lookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
  transport.mockResolvedValue(new Response("<title>Private</title>", { headers: { "content-type": "text/html" } }));

  expect(await fetchMetadata("http://localhost/")).toEqual(emptyMetadata);
  expect(transport).not.toHaveBeenCalled();
});

test("AC6_metadata_oversized_response_returns_empty", async () => {
  transport.mockResolvedValue(new Response("<title>Oversized</title>", {
    headers: { "content-type": "text/html", "content-length": "2097153" },
  }));

  expect(await fetchMetadata("https://example.test/")).toEqual(emptyMetadata);
});

test("AC6_metadata_timeout_returns_empty", async () => {
  vi.useFakeTimers();
  transport.mockImplementation((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  }));

  const result = fetchMetadata("https://example.test/");
  await vi.advanceTimersByTimeAsync(5000);

  expect(await result).toEqual(emptyMetadata);
});
