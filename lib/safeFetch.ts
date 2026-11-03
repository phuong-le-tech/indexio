import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

export interface SafeFetchOptions extends RequestInit {
  maxBytes?: number;
  timeoutMs?: number;
}

const MAX_REDIRECTS = 5;
const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 5000;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.168.0.0", 16],
  ["100.64.0.0", 10], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(address, prefix, "ipv4");
blocked.addAddress("::", "ipv6");
blocked.addAddress("::1", "ipv6");
blocked.addSubnet("fc00::", 7, "ipv6");
blocked.addSubnet("fe80::", 10, "ipv6");
blocked.addSubnet("ff00::", 8, "ipv6");

async function validateDestination(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Unsupported protocol");
  }
  if (process.env.ALLOW_PRIVATE_URLS === "true") return;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true });
  if (!addresses.length) throw new Error("DNS returned no addresses");
  if (addresses.some(({ address }) => blocked.check(address, isIP(address) === 6 ? "ipv6" : "ipv4"))) {
    throw new Error("Blocked address");
  }
  // shortcut: DNS is checked before fetch, not pinned; use only on trusted local networks.
}

async function readResponse(response: Response, maxBytes: number): Promise<Response> {
  if (Number(response.headers.get("content-length")) > maxBytes) {
    await response.body?.cancel();
    throw new Error("Response size limit exceeded");
  }
  if (!response.body) return response;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error("Response size limit exceeded");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new Response(Buffer.concat(chunks, size), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export async function safeFetch(url: string, options: SafeFetchOptions = {}): Promise<Response> {
  const { maxBytes = MAX_BYTES, timeoutMs = TIMEOUT_MS, signal: callerSignal, ...init } = options;
  const controller = new AbortController();
  const abort = () => controller.abort(new DOMException("Fetch timed out or aborted", "AbortError"));
  const timeout = setTimeout(abort, timeoutMs);
  callerSignal?.addEventListener("abort", abort, { once: true });
  if (callerSignal?.aborted) abort();
  const aborted = new Promise<never>((_, reject) => {
    if (controller.signal.aborted) reject(controller.signal.reason);
    else controller.signal.addEventListener("abort", () => reject(controller.signal.reason), { once: true });
  });
  const request = async () => {
    let destination = new URL(url);
    for (let redirects = 0; ; redirects++) {
      controller.signal.throwIfAborted();
      await validateDestination(destination);
      controller.signal.throwIfAborted();
      const response = await fetch(destination.toString(), {
        ...init, redirect: "manual", signal: controller.signal,
      });
      const location = response.headers.get("location");
      if (REDIRECT_STATUSES.has(response.status) && location) {
        await response.body?.cancel();
        if (redirects >= MAX_REDIRECTS) throw new Error("Redirect limit exceeded");
        destination = new URL(location, destination);
        continue;
      }
      return readResponse(response, maxBytes);
    }
  };
  try {
    return await Promise.race([request(), aborted]);
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener("abort", abort);
  }
}
