"use client";

import { useFormStatus } from "react-dom";
import { useState, type FormEvent, type ReactNode } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  className = "btn btn-primary",
  pendingText,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  pendingText?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-busy={pending}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export function CopyButton({ text, label = "نسخ", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={cn("btn btn-outline btn-sm", className)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
      {copied ? "تم النسخ" : label}
    </button>
  );
}

/** A form that asks for confirmation before submitting a (destructive) server action. */
export function ConfirmForm({
  action,
  message,
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  children: ReactNode;
  className?: string;
}) {
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (!window.confirm(message)) e.preventDefault();
  };
  return (
    <form action={action} onSubmit={onSubmit} className={className}>
      {children}
    </form>
  );
}

export function Collapsible({
  title,
  children,
  defaultOpen = false,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn("card", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-start text-sm font-bold text-slate-900"
      >
        {title}
        <span className={cn("text-slate-500 transition", open && "rotate-180")}>▾</span>
      </button>
      {open && <div className="border-t border-slate-200 px-5 py-4">{children}</div>}
    </div>
  );
}
