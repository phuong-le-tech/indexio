"use client";

import { FOCUS_RING } from "@/components/ui/styles";

// "dangerSolid" is the armed state of a two-step destructive action.
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dangerSolid";
export type ButtonSize = "sm" | "md";

const BASE =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-md)] font-medium whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-accent-solid)] text-[var(--color-inverse)] shadow-sm hover:bg-[var(--color-accent-hover)]",
  secondary:
    "border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm hover:bg-[var(--color-surface-hover)]",
  ghost:
    "text-[var(--color-ink-2)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]",
  danger:
    "bg-[var(--color-danger-bg)] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-[var(--color-inverse)]",
  dangerSolid:
    "bg-[var(--color-danger)] text-[var(--color-inverse)] shadow-sm hover:opacity-90",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[var(--text-xs)]",
  md: "h-10 px-4 text-[var(--text-sm)]",
};

interface ButtonClassOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

// Exposed so non-button elements (anchors, next/link) can share the look.
export function buttonClasses({
  variant = "secondary",
  size = "md",
  className = "",
}: ButtonClassOptions = {}) {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${FOCUS_RING} ${className}`.trim();
}

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<ButtonClassOptions, "className"> {
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses({ variant, size, className })}
      {...rest}
    />
  );
}
