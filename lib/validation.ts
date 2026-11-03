export function parseId(value: unknown): number;
export function parseId(): number {
  throw new Error("Not implemented: parseId");
}

export function validateString(value: unknown, options: { name: string; maxLength: number; allowEmpty?: boolean }): string;
export function validateString(): string {
  throw new Error("Not implemented: validateString");
}

export function validateCollection(value: unknown, options: { name: string; maxItems: number }): unknown[];
export function validateCollection(): unknown[] {
  throw new Error("Not implemented: validateCollection");
}

export function validateImportSize(bytes: number, rows: number): void;
export function validateImportSize(): void {
  throw new Error("Not implemented: validateImportSize");
}
