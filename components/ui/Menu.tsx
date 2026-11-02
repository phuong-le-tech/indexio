"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FOCUS_RING } from "@/components/ui/styles";

interface MenuItemBase {
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}

interface MenuActionItem extends MenuItemBase {
  onSelect: () => void;
  href?: undefined;
}

// Plain anchor, for file downloads that must not go through the client router.
interface MenuHrefItem extends MenuItemBase {
  href: string;
  onSelect?: undefined;
}

export type MenuItem = MenuActionItem | MenuHrefItem;

interface MenuProps {
  label: string;
  trigger: React.ReactNode;
  items: MenuItem[];
}

const ITEM_CLASS = `flex min-h-11 w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-left text-[var(--text-sm)] aria-disabled:pointer-events-none aria-disabled:opacity-50 ${FOCUS_RING}`;

export function Menu({ label, trigger, items }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  function enabledItems(): HTMLElement[] {
    return Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []
    );
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    enabledItems()[0]?.focus();

    function handlePointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function moveFocus(step: 1 | -1 | "first" | "last") {
    const list = enabledItems();
    if (list.length === 0) return;
    const current = list.indexOf(document.activeElement as HTMLElement);
    let next: number;
    if (step === "first") next = 0;
    else if (step === "last") next = list.length - 1;
    else next = (current + step + list.length) % list.length;
    list[next].focus();
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function handleMenuKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveFocus(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveFocus(-1);
        break;
      case "Home":
        e.preventDefault();
        moveFocus("first");
        break;
      case "End":
        e.preventDefault();
        moveFocus("last");
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        close(true);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  function handleSelect(item: MenuItem) {
    if (item.disabled) return;
    close(true);
    item.onSelect?.();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)] aria-expanded:bg-[var(--color-surface-hover)] ${FOCUS_RING}`}
      >
        {trigger}
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-full z-50 mt-2 w-52 origin-top-right animate-pop-in rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-raised)] p-1 shadow-lg"
        >
          {items.map((item) => {
            const tone = item.danger
              ? "text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] focus-visible:bg-[var(--color-danger-bg)]"
              : "text-[var(--color-ink)] hover:bg-[var(--color-surface-hover)] focus-visible:bg-[var(--color-surface-hover)]";
            const content = (
              <>
                {item.icon && <span className="shrink-0 opacity-75">{item.icon}</span>}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </>
            );
            if (item.href !== undefined) {
              return (
                <a
                  key={item.label}
                  role="menuitem"
                  tabIndex={-1}
                  href={item.href}
                  aria-disabled={item.disabled || undefined}
                  onClick={() => close(false)}
                  className={`${ITEM_CLASS} ${tone}`}
                >
                  {content}
                </a>
              );
            }
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                tabIndex={-1}
                aria-disabled={item.disabled || undefined}
                onClick={() => handleSelect(item)}
                className={`${ITEM_CLASS} ${tone}`}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
