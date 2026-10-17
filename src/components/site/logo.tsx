import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Brand mark: a physics atom – violet electron orbits around an apricot nucleus,
 * sitting in a soft lavender rounded square.
 */
export function AtomMark({ className, light = false }: { className?: string; light?: boolean }) {
  const ring = light ? "#ffffff" : "#7c5cff";
  const nucleus = light ? "#ffffff" : "#ff9a62";
  const electron = light ? "#ede7ff" : "#a186ff";
  return (
    <svg viewBox="0 0 64 64" className={cn("size-10", className)} aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="18" fill={light ? "rgba(255,255,255,0.14)" : undefined} className={light ? undefined : "fill-[#f3f0ff] dark:fill-[#2a2b55]"} />
      <g fill="none" stroke={ring} strokeWidth="2.6" strokeLinecap="round">
        <ellipse cx="32" cy="32" rx="22" ry="9" />
        <ellipse cx="32" cy="32" rx="22" ry="9" transform="rotate(60 32 32)" />
        <ellipse cx="32" cy="32" rx="22" ry="9" transform="rotate(120 32 32)" />
      </g>
      <circle cx="32" cy="32" r="5.2" fill={nucleus} />
      <circle cx="54" cy="32" r="2.6" fill={electron} />
      <circle cx="21" cy="13" r="2.6" fill={electron} />
      <circle cx="21" cy="51" r="2.6" fill={electron} />
    </svg>
  );
}

export function Logo({ siteName, teacherName, className, light = false, logoUrl }: { siteName: string; teacherName: string; className?: string; light?: boolean; logoUrl?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)} aria-label={siteName}>
      {logoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={logoUrl} alt="" className="h-11 w-auto max-w-44 shrink-0 rounded-xl object-contain" />
      ) : (
        <AtomMark className="size-11" light={light} />
      )}
      <span className="font-amin leading-none">
        <span className={cn("block text-lg font-bold sm:text-xl", light ? "text-white" : "text-slate-900")}>{teacherName.replace(/^م\/\s*/, "")}</span>
        <span className={cn("mt-0.5 block text-[10px] font-bold sm:text-[11px]", light ? "text-white/80" : "text-brand-600")}>منصة الفيزياء للثانوية العامة</span>
      </span>
    </Link>
  );
}
