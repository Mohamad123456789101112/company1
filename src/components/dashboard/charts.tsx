import { cn } from "@/lib/utils";

/** Server-friendly bar chart (pure CSS). */
export function BarChart({ data, className, color = "from-brand-500 to-brand-300", height = 120, valueSuffix = "" }: { data: { label: string; value: number; hint?: string }[]; className?: string; color?: string; height?: number; valueSuffix?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className={cn("flex items-end gap-1.5", className)} style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="group flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.hint ?? d.label}: ${d.value}${valueSuffix}`}>
          <span className="text-[10px] font-bold text-slate-500 opacity-0 transition group-hover:opacity-100">{d.value}{valueSuffix}</span>
          <div className={cn("w-full max-w-8 rounded-t-md bg-gradient-to-t transition group-hover:opacity-90", color)} style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }} />
          <span className="truncate text-[10px] text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Circular progress ring (SVG). */
export function ProgressRing({ value, size = 96, stroke = 10, className, label }: { value: number; size?: number; stroke?: number; className?: string; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeWidth={stroke} fill="none" className="text-white/25" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (v / 100) * c} className="text-white transition-all duration-700" />
      </svg>
      <div className="absolute text-center">
        <p className="font-amin text-xl font-bold leading-none">{Math.round(v)}%</p>
        {label && <p className="mt-0.5 text-[10px] opacity-80">{label}</p>}
      </div>
    </div>
  );
}
