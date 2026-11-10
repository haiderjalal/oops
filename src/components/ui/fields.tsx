"use client";

import type {
  InputHTMLAttributes,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useId } from "react";

import { cn } from "@/utils/cn";

const CONTROL =
  "w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[0.95rem] text-ink " +
  "placeholder:text-ink-muted transition-colors hover:border-ink/30 " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:bg-danger/[0.04] disabled:opacity-60";

export function controlStyles(className?: string): string {
  return cn(CONTROL, className);
}

export function Input({
  className,
  ref,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} className={controlStyles(className)} {...rest} />;
}

export function Textarea({
  className,
  ref,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return (
    <textarea
      ref={ref}
      className={controlStyles(cn("min-h-28 leading-relaxed", className))}
      {...rest}
    />
  );
}

export function Select({
  className,
  ref,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { ref?: Ref<HTMLSelectElement> }) {
  return (
    <select ref={ref} className={controlStyles(cn("appearance-auto pr-8", className))} {...rest}>
      {children}
    </select>
  );
}

export interface ControlA11yProps {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": boolean | undefined;
}

interface FieldProps {
  label: string;
  hint?: string;
  error?: string | undefined;
  required?: boolean;
  className?: string;
  /** Receives the ids that wire the label, hint and error message to the control. */
  children: (control: ControlA11yProps) => ReactNode;
}

/** Label + control + hint + error, wired together for screen readers. Never relies on placeholder text. */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-bold text-ink">
        {label}
        {required ? (
          <span className="text-coral-deep" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint ? (
        <p id={hintId} className="text-[0.8rem] leading-snug text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-[0.8rem] font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
