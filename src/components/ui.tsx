import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Info, Inbox, TriangleAlert } from "lucide-react";
import { cn, initials } from "@/lib/utils";

/* ───────── Form primitives ───────── */

export function Field({
  label,
  name,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  name?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("input", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("input min-h-28 resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn("input", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
    </div>
  );
}

export function Checkbox({
  label,
  name,
  defaultChecked,
  hint,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm hover:bg-slate-100">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-1 size-4 shrink-0 accent-cyan-400"
      />
      <span>
        <span className="block font-semibold text-slate-800">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

/* ───────── Feedback ───────── */

type Tone = "info" | "success" | "warning" | "danger";

const toneStyles: Record<Tone, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
};

const toneIcon: Record<Tone, ReactNode> = {
  info: <Info className="size-4 shrink-0" />,
  success: <CheckCircle2 className="size-4 shrink-0" />,
  warning: <TriangleAlert className="size-4 shrink-0" />,
  danger: <AlertCircle className="size-4 shrink-0" />,
};

export function Alert({ tone = "info", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-semibold", toneStyles[tone], className)}>
      {toneIcon[tone]}
      <div className="leading-6">{children}</div>
    </div>
  );
}

export function FormMessage({ state }: { state: { error?: string; message?: string; ok?: boolean } | null | undefined }) {
  if (!state) return null;
  if (state.error) return <Alert tone="danger">{state.error}</Alert>;
  if (state.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "accent" | "success" | "danger" | "warning" | "violet";
  className?: string;
}) {
  const tones = {
    neutral: "border-slate-200 bg-slate-100 text-slate-700",
    brand: "border-brand-200 bg-brand-50 text-brand-700",
    accent: "border-peach-200 bg-peach-50 text-peach-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    danger: "border-rose-200 bg-rose-50 text-rose-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
  };
  return <span className={cn("badge", tones[tone], className)}>{children}</span>;
}

/* ───────── Layout helpers ───────── */

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-bold tracking-wider text-brand-400">{eyebrow}</p>}
        <h1 className="break-anywhere text-xl font-black text-slate-900 sm:text-2xl lg:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = "brand",
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
  tone?: "brand" | "accent" | "success" | "violet" | "rose";
}) {
  const tones = {
    brand: "from-brand-100 to-brand-50 text-brand-700",
    accent: "from-peach-100 to-peach-50 text-peach-700",
    success: "from-emerald-100 to-emerald-50 text-emerald-700",
    violet: "from-violet-100 to-violet-50 text-violet-700",
    rose: "from-rose-100 to-rose-50 text-rose-700",
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        {icon && (
          <div className={cn("grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br", tones[tone])}>{icon}</div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
        <Inbox className="size-7" />
      </div>
      <h3 className="mt-4 text-lg font-black text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} referrerPolicy="no-referrer" />;
  }
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-black text-white"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-200", className)}>
      <div className="h-full rounded-full bg-gradient-to-l from-brand-500 to-peach-400 transition-all" style={{ width: `${v}%` }} />
    </div>
  );
}
