"use client";

import { Quote, Star } from "lucide-react";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";

export type MarqueeItem = { id: string; name: string; role: string | null; text: string; stars: number; avatarUrl: string | null };

function Card({ t }: { t: MarqueeItem }) {
  return (
    <figure className="card relative flex h-full w-[280px] shrink-0 flex-col p-5 transition duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-glow sm:w-[340px]">
      <Quote className="absolute left-4 top-4 size-8 text-brand-200/70" aria-hidden="true" />
      <div className="flex gap-0.5" aria-label={`${t.stars} من 5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={cn("size-4", i < t.stars ? "fill-peach-400 text-peach-400" : "text-slate-300")} />
        ))}
      </div>
      <blockquote className="mt-3 line-clamp-4 flex-1 font-taj text-sm leading-7 text-slate-700 dark:text-white">“{t.text}”</blockquote>
      <figcaption className="mt-4 flex items-center gap-3 border-t border-slate-200/70 pt-3 dark:border-white/10">
        <span className="rounded-full bg-gradient-to-br from-brand-400 to-peach-400 p-[2px] shadow-md">
          <span className="block rounded-full bg-white p-[2px]">
            <Avatar name={t.name} src={t.avatarUrl} size={44} />
          </span>
        </span>
        <span className="min-w-0">
          <span className="block truncate font-amin text-sm font-bold text-slate-900 dark:text-white">{t.name}</span>
          <span className="block truncate text-xs text-brand-600 dark:text-[#b9adff]">{t.role ?? "طالب"}</span>
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * One continuous row of cards gliding side by side over a single
 * high-resolution background block. Pauses on hover / touch. Pure CSS.
 */
export function TestimonialsMarquee({ items }: { items: MarqueeItem[] }) {
  if (!items.length) return null;
  // Make sure the track is long enough to loop smoothly even with few items
  const base = items.length < 6 ? [...items, ...items, ...items].slice(0, Math.max(6, items.length * 2)) : items;
  return (
    <div className="marquee group/row py-2" dir="ltr">
      <div className="marquee-track">
        {[...base, ...base].map((t, i) => (
          <div key={`${t.id}-${i}`} className="px-2.5" dir="rtl" aria-hidden={i >= base.length}>
            <Card t={t} />
          </div>
        ))}
      </div>
    </div>
  );
}
