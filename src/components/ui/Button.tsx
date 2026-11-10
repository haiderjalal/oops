import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dark";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap select-none " +
  "transition-[transform,background-color,box-shadow,color,border-color] duration-200 " +
  "disabled:pointer-events-none disabled:opacity-50 active:translate-y-px";

const VARIANTS: Record<ButtonVariant, string> = {
  // Ink text on coral keeps contrast above 4.5:1 (white on coral would not).
  primary:
    "bg-coral text-ink shadow-[0_3px_0_0_var(--color-coral-deep)] hover:brightness-105 active:shadow-[0_1px_0_0_var(--color-coral-deep)]",
  secondary: "border border-line bg-paper text-ink hover:border-ink/40 hover:bg-white",
  ghost: "text-ink hover:bg-ink/[0.07]",
  danger: "bg-danger text-white hover:brightness-110",
  dark: "bg-ink text-parchment hover:bg-ocean-deep",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 px-4 text-sm",
  md: "min-h-11 px-5 text-[0.95rem]",
  lg: "min-h-12 px-7 text-base",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  type = "button",
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, className })}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
