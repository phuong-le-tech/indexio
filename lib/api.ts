import { NextResponse } from "next/server";
import { inputError, inputErrorStatus } from "./validation";

const MAX_JSON_BYTES = 128 * 1024;
// A 2 MiB import may expand sixfold when its content is JSON-escaped.
export const MAX_IMPORT_REQUEST_BYTES = 16 * 1024 * 1024;

export async function readJson(request: Request, maxBytes = MAX_JSON_BYTES): Promise<Record<string, unknown>> {
  if (Number(request.headers.get("content-length")) > maxBytes) {
    throw inputError("Request size limit exceeded", 413);
  }
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    if (reader) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxBytes) {
          await reader.cancel();
          throw inputError("Request size limit exceeded", 413);
        }
        chunks.push(value);
      }
    }
  } finally {
    reader?.releaseLock();
  }
  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks, bytes).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw inputError("Invalid request");
  }
}

export function withApiErrors<Args extends unknown[], Result extends Response>(handler: (...args: Args) => Promise<Result>) {
  return async (...args: Args): Promise<Result | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      const status = inputErrorStatus(error);
      if (status && error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status });
      }
      console.error("API request failed");
      return NextResponse.json({ error: "Request failed" }, { status: 500 });
    }
  };
}
