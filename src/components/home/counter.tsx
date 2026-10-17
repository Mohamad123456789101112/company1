"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/** Count-up number that animates when scrolled into view (eased expo-out). */
export function CountUp({ from = 0, to = 1000, duration = 1800, prefix = "+", label = "" }: { from?: number; to?: number; duration?: number; prefix?: string; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [value, setValue] = useState(from);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setStarted(true), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setValue(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, from, to, duration]);

  const text = useMemo(() => (value < 1000 ? `${prefix}${Math.floor(value)}` : `${prefix}${(value / 1000).toFixed(1)}K`), [value, prefix]);

  return (
    <div ref={ref} className="text-center md:text-right">
      <div className="text-4xl font-bold leading-none tabular-nums md:text-6xl" dir="ltr" style={{ fontVariantNumeric: "tabular-nums" }}>{text}</div>
      <div className="mt-4 text-sm text-white/90 md:text-lg">{label}</div>
    </div>
  );
}
