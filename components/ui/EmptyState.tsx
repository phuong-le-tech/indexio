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
    <section className="border-y border-[var(--color-line)] py-10 sm:py-14" aria-labelledby="library-state-title">
      <div className="flex items-start gap-4 sm:gap-6">
        <span aria-hidden="true" className="pt-2 text-[var(--color-accent)]">{icon}</span>
        <div className="min-w-0">
          <h2 id="library-state-title" className="font-display text-3xl sm:text-4xl">{title}</h2>
          <p className="mt-3 max-w-md text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">{description}</p>
          <Button variant="primary" className="mt-6" onClick={onAction}>{actionLabel}</Button>
        </div>
      </div>
    </section>
  );
}
