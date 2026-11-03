"use client";

import { Button } from "@/components/ui/Button";
import { FOCUS_RING } from "@/components/ui/styles";
import { XIcon } from "@/components/ui/Icon";
import { TagPicker } from "@/components/ui/TagPicker";

interface BulkBarProps {
  selectedCount: number;
  otherPageCount: number;
  availableTags: string[];
  tags: string[];
  onTagsChange: (value: string[]) => void;
  onAddTag: () => void;
  deleteArmed: boolean;
  onDelete: () => void;
  onCancel: () => void;
  busy: boolean;
}

export function BulkBar({
  selectedCount,
  otherPageCount,
  availableTags,
  tags,
  onTagsChange,
  onAddTag,
  deleteArmed,
  onDelete,
  onCancel,
  busy,
}: BulkBarProps) {
  const nothingSelected = selectedCount === 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
      <div
        role="region"
        aria-label="Bulk actions"
        className="pointer-events-auto flex w-full max-w-2xl animate-pop-in flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface-raised)] p-3 shadow-lg"
      >
        <span
          role="status"
          className="mr-auto text-[length:var(--text-sm)] font-medium whitespace-nowrap text-[var(--color-ink)]"
        >
          {selectedCount} selected
          {otherPageCount > 0 && ` (${otherPageCount} on other pages)`}
        </span>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onAddTag();
          }}
          className="flex w-full min-w-0 basis-full items-center gap-2"
        >
          <div className="min-w-0 flex-1"><TagPicker above availableTags={availableTags} selected={tags} onChange={onTagsChange} disabled={nothingSelected || busy} /></div>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={!tags.length || nothingSelected || busy}
          >
            Add tags
          </Button>
        </form>
        <Button
          variant={deleteArmed ? "dangerSolid" : "danger"}
          size="sm"
          onClick={onDelete}
          disabled={nothingSelected || busy}
        >
          {deleteArmed ? "Confirm?" : "Delete"}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel selection"
          disabled={busy}
          className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-ink-3)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)] ${FOCUS_RING}`}
        >
          <XIcon size={16} />
        </button>
      </div>
    </div>
  );
}
