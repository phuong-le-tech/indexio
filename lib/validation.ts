export const MAX_URL_LENGTH = 4096;
export const MAX_TAG_LENGTH = 100;
export const MAX_NOTES_LENGTH = 10_000;
export const MAX_BULK_IDS = 500;
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 1000;

const inputErrors = new WeakMap<Error, number>();

export function inputError(message: string, status = 400): Error {
  const error = new Error(message);
  inputErrors.set(error, status);
  return error;
}

export function inputErrorStatus(error: unknown): number | undefined {
  return error instanceof Error ? inputErrors.get(error) : undefined;
}

export function parseId(value: unknown): number {
  if ((typeof value !== "string" && typeof value !== "number") ||
      (typeof value === "string" && !/^\d+$/.test(value))) {
    throw inputError("Invalid id");
  }
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1 || id > 2_147_483_647) throw inputError("Invalid id");
  return id;
}

export function validateString(value: unknown, options: { name: string; maxLength: number; allowEmpty?: boolean }): string {
  if (typeof value !== "string" || (!options.allowEmpty && !value.length) || value.length > options.maxLength) {
    throw inputError(`Invalid ${options.name}`);
  }
  return value;
}

export function validateCollection(value: unknown, options: { name: string; maxItems: number }): unknown[] {
  if (!Array.isArray(value) || !value.length || value.length > options.maxItems) {
    throw inputError(`Invalid ${options.name}`);
  }
  return value;
}

export function validateImportSize(bytes: number, rows: number): void {
  if (bytes > MAX_IMPORT_BYTES || rows > MAX_IMPORT_ROWS) {
    throw inputError("Import limit exceeded", 413);
  }
}

export function validateTags(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > MAX_BULK_IDS) throw inputError("Invalid tags");
  return value.map((tag) => validateString(tag, { name: "tag", maxLength: MAX_TAG_LENGTH }).trim()).filter(Boolean);
}

export function validateUrl(value: unknown): string {
  const url = validateString(value, { name: "url", maxLength: MAX_URL_LENGTH }).trim();
  try {
    if (!["http:", "https:"].includes(new URL(url).protocol)) throw new Error();
  } catch {
    throw inputError("Invalid URL");
  }
  return url;
}

export function validateNotes(value: unknown): string {
  return validateString(value, { name: "notes", maxLength: MAX_NOTES_LENGTH, allowEmpty: true }).trim();
}
