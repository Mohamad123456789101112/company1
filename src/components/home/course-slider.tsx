"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** RTL scroll-snap slider with arrows, dots and an edge fade (Swiper-like). */
export function CourseSlider({ children, count }: { children: ReactNode; count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<"start" | "middle" | "end">("start");
  const [active, setActive] = useState(0);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const x = Math.abs(el.scrollLeft);
    setPos(x < 8 ? "start" : x > max - 8 ? "end" : "middle");
    const slide = el.querySelector<HTMLElement>(".slide");
    if (slide) setActive(Math.min(count - 1, Math.round(x / (slide.offsetWidth + 16))));
  };

  useEffect(() => {
    update();
    const el = ref.current;
    el?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const slide = el.querySelector<HTMLElement>(".slide");
    const step = (slide?.offsetWidth ?? 320) + 16;
    // RTL: scrolling "next" moves to negative scrollLeft
    el.scrollBy({ left: -dir * step, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div ref={ref} className="slider" dir="rtl">
        {children}
      </div>
      <div className={cn("pointer-events-none absolute inset-y-0 left-0 z-10 w-1/4 bg-gradient-to-r from-lav-50 to-transparent transition", pos === "end" ? "opacity-0" : "opacity-100")} />

      <button type="button" aria-label="التالي" onClick={() => go(1)} disabled={pos === "end"} className="absolute left-3 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-brand-600 shadow-lg ring-1 ring-lav-200 transition hover:bg-brand-500 hover:text-white disabled:opacity-30 md:left-6">
        <ChevronLeft className="size-6" />
      </button>
      <button type="button" aria-label="السابق" onClick={() => go(-1)} disabled={pos === "start"} className="absolute right-3 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-brand-600 shadow-lg ring-1 ring-lav-200 transition hover:bg-brand-500 hover:text-white disabled:opacity-30 md:right-6">
        <ChevronRight className="size-6" />
      </button>

      <div className="flex justify-center gap-1.5 pb-2">
        {Array.from({ length: count }).map((_, i) => (
          <span key={i} className={cn("h-2 rounded-full transition-all", i === active ? "w-6 bg-tomato-500" : "w-2 bg-slate-300")} />
        ))}
      </div>
    </div>
  );
}
