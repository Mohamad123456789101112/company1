"use client";

import { Quote, Star } from "lucide-react";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";

export type MarqueeItem = { id: string; name: string; role: string | null; text: string; stars: number; avatarUrl: string | null };

function Card({ t }: { t: MarqueeItem }) {
  return (
    <figure className="relative flex h-full w-[280px] shrink-0 flex-col rounded-2xl border border-white/60 bg-white/85 p-5 shadow-[0_10px_30px_-14px_rgba(59,39,134,0.35)] backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:bg-white sm:w-[340px] dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15">
      <Quote className="absolute left-4 top-4 size-8 text-brand-200/70" aria-hidden="true" />
      <div className="flex gap-0.5" aria-label={`${t.stars} من 5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={cn("size-4", i < t.stars ? "fill-peach-400 text-peach-400" : "text-slate-300")} />
        ))}
      </div>
      <blockquote className="mt-3 line-clamp-4 flex-1 font-taj text-sm leading-7 text-slate-700 dark:text-slate-200">“{t.text}”</blockquote>
      <figcaption className="mt-4 flex items-center gap-3 border-t border-slate-200/70 pt-3 dark:border-white/10">
        <span className="rounded-full bg-gradient-to-br from-brand-400 to-peach-400 p-[2px] shadow-md">
          <span className="block rounded-full bg-white p-[2px]">
            <Avatar name={t.name} src={t.avatarUrl} size={44} />
          </span>
        </span>
        <span className="min-w-0">
          <span className="block truncate font-amin text-sm font-bold text-slate-900 dark:text-white">{t.name}</span>
          <span className="block truncate text-xs text-brand-600 dark:text-brand-300">{t.role ?? "طالب"}</span>
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * One continuous row of cards gliding right→left (RTL) directly on the
 * page background — no floating panel, no inner theme. Pauses on hover /
 * touch. Pure CSS animation.
 */
export function TestimonialsMarquee({ items }: { items: MarqueeItem[] }) {
  if (!items.length) return null;
  // Make sure the track is long enough to loop smoothly even with few items
  const base = items.length < 6 ? [...items, ...items, ...items].slice(0, Math.max(6, items.length * 2)) : items;
  return (
    <div className="marquee group/row py-2">
      <div className="marquee-track">
        {[...base, ...base].map((t, i) => (
          <div key={`${t.id}-${i}`} className="px-2.5" aria-hidden={i >= base.length}>
            <Card t={t} />
          </div>
        ))}
      </div>
    </div>
  );
}
