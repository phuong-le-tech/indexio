"use client";

import { MoreIcon, PlusIcon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { ShortcutsHelp } from "@/components/ui/ShortcutsHelp";

interface AppHeaderProps {
  totalLinks: number;
  menuItems: MenuItem[];
  onAdd: () => void;
}

export function AppHeader({ totalLinks, menuItems, onAdd }: AppHeaderProps) {
  return (
    <header className="border-b border-[var(--color-line)]">
      <div className="mx-auto flex min-h-24 w-full max-w-[var(--container-wide)] flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <div className="flex min-w-0 items-baseline gap-4">
          <span className="font-display text-3xl text-[var(--color-ink)]">Indexio<span className="text-[var(--color-accent)]">.</span></span>
          <span className="hidden font-mono text-[var(--text-xs)] text-[var(--color-ink-3)] sm:inline">A personal link index</span>
          <span className="sr-only">{totalLinks} links</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="primary" size="sm" onClick={onAdd}><PlusIcon size={15} /> Add</Button>
          <ShortcutsHelp />
          <Menu label="More actions" trigger={<MoreIcon size={18} />} items={menuItems} />
        </div>
      </div>
    </header>
  );
}
