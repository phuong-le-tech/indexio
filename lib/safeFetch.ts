export interface SafeFetchOptions extends RequestInit {
  maxBytes?: number;
  timeoutMs?: number;
}

export function safeFetch(url: string, options?: SafeFetchOptions): Promise<Response>;
export async function safeFetch(): Promise<Response> {
  throw new Error("Not implemented: safeFetch");
}
