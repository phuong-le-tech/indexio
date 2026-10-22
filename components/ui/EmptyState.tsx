"use client";

import { Button } from "@/components/ui/Button";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line)] px-5 py-14 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-accent-bg)] text-[var(--color-accent)]">
        {icon}
      </span>
      <h2 className="text-[var(--text-base)] font-semibold text-[var(--color-ink)]">{title}</h2>
      <p className="mt-1 max-w-sm text-[var(--text-sm)] text-[var(--color-ink-2)]">{description}</p>
      <Button variant="primary" className="mt-5" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}
