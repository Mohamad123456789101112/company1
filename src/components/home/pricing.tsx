import Link from "next/link";
import { Check, Crown, Flame, Rocket, Sparkles, X } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

export type PricingPlan = {
  key: "basic" | "premium" | "vip";
  name: string;
  tagline: string;
  price: number;
  oldPrice?: number;
  period: string;
  features: { text: string; included: boolean }[];
  cta: string;
  popular?: boolean;
};

const STYLES = {
  basic: {
    icon: Rocket,
    ring: "from-sky-300 via-brand-300 to-brand-400",
    glow: "shadow-[0_25px_60px_-25px_rgba(124,92,255,0.45)]",
    chip: "bg-sky-50 text-sky-700 border-sky-200",
    iconBox: "from-sky-400 to-brand-500",
    check: "text-sky-500",
    button: "bg-gradient-to-l from-sky-500 to-brand-500 hover:from-sky-600 hover:to-brand-600 text-white shadow-[0_12px_30px_-12px_rgba(124,92,255,0.7)]",
    price: "from-sky-600 to-brand-600",
  },
  premium: {
    icon: Crown,
    ring: "from-brand-400 via-brand-500 to-peach-400",
    glow: "shadow-[0_35px_80px_-25px_rgba(124,92,255,0.6)]",
    chip: "bg-brand-50 text-brand-700 border-brand-200",
    iconBox: "from-brand-500 to-brand-700",
    check: "text-brand-500",
    button: "bg-gradient-to-l from-brand-500 to-brand-700 hover:from-brand-600 hover:to-brand-800 text-white shadow-[0_12px_30px_-12px_rgba(124,92,255,0.8)]",
    price: "from-brand-600 to-brand-800",
  },
  vip: {
    icon: Flame,
    ring: "from-peach-300 via-peach-400 to-rose-300",
    glow: "shadow-[0_25px_60px_-25px_rgba(249,127,63,0.5)]",
    chip: "bg-peach-50 text-peach-700 border-peach-200",
    iconBox: "from-peach-400 to-rose-400",
    check: "text-peach-500",
    button: "bg-gradient-to-l from-peach-400 to-rose-400 hover:from-peach-500 hover:to-rose-500 text-white shadow-[0_12px_30px_-12px_rgba(249,127,63,0.7)]",
    price: "from-peach-500 to-rose-500",
  },
} as const;

export function PricingCard({ plan, href }: { plan: PricingPlan; href: string }) {
  const s = STYLES[plan.key];
  const Icon = s.icon;
  return (
    <div className={cn("group relative h-full rounded-[1.75rem] p-[2px] transition duration-500 hover:-translate-y-2", "bg-gradient-to-br", s.ring, s.glow, plan.popular && "md:col-span-2 lg:col-span-1 lg:-translate-y-4 lg:hover:-translate-y-6")}>
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 z-20 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-peach-400 to-peach-500 px-4 py-1.5 font-amin text-xs font-bold text-white shadow-lg ring-4 ring-white">
            <Sparkles className="size-3.5" /> الأكثر اختيارًا
          </span>
        </div>
      )}
      <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(1.75rem-2px)] bg-white p-7">
        {/* soft blob */}
        <div className={cn("pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-gradient-to-br opacity-15 blur-2xl transition duration-700 group-hover:scale-150 group-hover:opacity-25", s.ring)} />

        <div className="relative flex items-start justify-between">
          <div>
            <span className={cn("badge border", s.chip)}>{plan.tagline}</span>
            <h3 className="mt-3 font-amin text-2xl font-bold text-slate-900">{plan.name}</h3>
          </div>
          <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", s.iconBox)}>
            <Icon className="size-6" />
          </span>
        </div>

        <div className="relative mt-6 flex items-end gap-2">
          <span className={cn("bg-gradient-to-l bg-clip-text font-amin text-5xl font-bold leading-none text-transparent", s.price)} dir="ltr">{formatNumber(plan.price)}</span>
          <span className="pb-1 font-taj text-sm text-slate-500">جنيه / {plan.period}</span>
        </div>
        {plan.oldPrice && plan.oldPrice > plan.price && (
          <p className="mt-1 font-taj text-xs text-slate-400">
            بدلاً من <span className="font-bold text-rose-500 line-through">{formatNumber(plan.oldPrice)} جنيه</span>
            <span className="ms-2 rounded-md bg-rose-50 px-1.5 py-0.5 font-bold text-rose-600">وفّر {Math.round(((plan.oldPrice - plan.price) / plan.oldPrice) * 100)}%</span>
          </p>
        )}

        <div className="my-6 h-px bg-gradient-to-l from-transparent via-lav-300 to-transparent" />

        <ul className="relative flex-1 space-y-3 font-taj text-sm">
          {plan.features.map((f) => (
            <li key={f.text} className={cn("flex items-start gap-2.5", f.included ? "text-slate-700" : "text-slate-400 line-through decoration-slate-300")}>
              {f.included ? (
                <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-lav-100", s.check)}><Check className="size-3.5" strokeWidth={3} /></span>
              ) : (
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-lav-100 text-slate-300"><X className="size-3.5" strokeWidth={3} /></span>
              )}
              {f.text}
            </li>
          ))}
        </ul>

        <Link href={href} className={cn("btn relative mt-7 w-full rounded-2xl border-0 py-3.5 font-amin text-base transition-transform group-hover:scale-[1.02]", s.button)}>
          {plan.cta}
        </Link>
        <p className="mt-3 text-center font-taj text-[11px] text-slate-400">الدفع عبر فودافون كاش • تفعيل بعد التأكيد • أكواد السنتر متاحة</p>
      </div>
    </div>
  );
}
