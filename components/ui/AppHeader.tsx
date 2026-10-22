"use client";

import { LinkIcon, MoreIcon, PlusIcon } from "@/components/ui/Icon";
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
    <header className="sticky top-0 z-40 border-b border-[var(--color-hairline)] bg-[var(--color-page)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[var(--container-wide)] items-center justify-between gap-3 px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-solid)] text-[var(--color-inverse)] shadow-sm"
            aria-hidden="true"
          >
            <LinkIcon size={15} />
          </span>
          <h1 className="text-[var(--text-lg)] font-semibold tracking-tight text-[var(--color-ink)]">
            Indexio
          </h1>
          <span className="rounded-[var(--radius-full)] bg-[var(--color-inset)] px-2 py-0.5 font-mono text-[var(--text-2xs)] text-[var(--color-ink-2)]">
            {totalLinks} link{totalLinks === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="primary" size="sm" onClick={onAdd}>
            <PlusIcon size={14} />
            Add
          </Button>
          <ShortcutsHelp />
          <Menu
            label="More actions"
            trigger={<MoreIcon size={18} />}
            items={menuItems}
          />
        </div>
      </div>
    </header>
  );
}
