"use client";

import { Button } from "@/components/ui/Button";
import { FOCUS_RING } from "@/components/ui/styles";
import { XIcon } from "@/components/ui/Icon";

interface BulkBarProps {
  selectedCount: number;
  tagInput: string;
  onTagInputChange: (value: string) => void;
  onAddTag: () => void;
  deleteArmed: boolean;
  onDelete: () => void;
  onCancel: () => void;
  busy: boolean;
}

export function BulkBar({
  selectedCount,
  tagInput,
  onTagInputChange,
  onAddTag,
  deleteArmed,
  onDelete,
  onCancel,
  busy,
}: BulkBarProps) {
  const nothingSelected = selectedCount === 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div
        role="region"
        aria-label="Bulk actions"
        className="pointer-events-auto flex w-full max-w-2xl animate-pop-in flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-raised)] p-2 pl-4 shadow-lg"
      >
        <span
          role="status"
          className="mr-auto text-[var(--text-sm)] font-medium whitespace-nowrap text-[var(--color-ink)]"
        >
          {selectedCount} selected
        </span>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onAddTag();
          }}
          className="flex min-w-0 basis-full items-center gap-2 sm:basis-auto"
        >
          <input
            type="text"
            value={tagInput}
            onChange={(e) => onTagInputChange(e.target.value)}
            placeholder="Add tag to selected…"
            aria-label="Tag to add to selected links"
            disabled={nothingSelected || busy}
            className="h-8 min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-inset)] px-2.5 text-[var(--text-xs)] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-accent)] disabled:opacity-50 sm:w-44 sm:flex-none"
          />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={!tagInput.trim() || nothingSelected || busy}
          >
            Add tag
          </Button>
        </form>
        <Button
          variant="danger"
          size="sm"
          onClick={onDelete}
          disabled={nothingSelected || busy}
          className={deleteArmed ? "bg-[var(--color-danger)] text-[var(--color-inverse)]" : ""}
        >
          {deleteArmed ? "Confirm?" : "Delete"}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel selection"
          className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-ink-3)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)] ${FOCUS_RING}`}
        >
          <XIcon size={16} />
        </button>
      </div>
    </div>
  );
}
