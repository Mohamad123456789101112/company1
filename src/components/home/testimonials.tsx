import { Quote, Star } from "lucide-react";
import type { Testimonial } from "@/db/schema";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";

export function TestimonialCard({ t, className }: { t: Testimonial; className?: string }) {
  return (
    <figure className={cn("card relative flex h-full flex-col p-6 transition duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-glow", className)}>
      <Quote className="absolute left-5 top-5 size-9 text-brand-100" aria-hidden="true" />
      <div className="flex gap-0.5" aria-label={`${t.stars} من 5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={cn("size-4", i < t.stars ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
        ))}
      </div>
      <blockquote className="mt-4 flex-1 font-taj text-sm leading-8 text-slate-600">“{t.text}”</blockquote>
      <figcaption className="mt-5 flex items-center gap-3 border-t border-lav-200 pt-4">
        <span className="rounded-full bg-gradient-to-br from-brand-400 to-peach-400 p-[2px] shadow-md">
          <span className="block rounded-full bg-white p-[2px]">
            <Avatar name={t.name} src={t.avatarUrl} size={52} />
          </span>
        </span>
        <span>
          <span className="block font-amin text-sm font-bold text-slate-900">{t.name}</span>
          <span className="block text-xs text-brand-600">{t.role ?? "طالب"}</span>
        </span>
      </figcaption>
    </figure>
  );
}
