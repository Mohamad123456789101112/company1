"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Live countdown to a timestamp; refreshes the page when it hits zero. */
export function Countdown({ to, label, className }: { to: number; label?: string; className?: string }) {
  const router = useRouter();
  const [left, setLeft] = useState(() => Math.max(0, to - Date.now()));
  useEffect(() => {
    const id = setInterval(() => {
      const l = Math.max(0, to - Date.now());
      setLeft(l);
      if (l === 0) {
        clearInterval(id);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [to, router]);
  const d = Math.floor(left / 86_400_000);
  const h = Math.floor((left % 86_400_000) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  const parts = [
    ...(d > 0 ? [{ v: d, l: "يوم" }] : []),
    { v: h, l: "ساعة" },
    { v: m, l: "دقيقة" },
    { v: s, l: "ثانية" },
  ];
  return (
    <div className={className}>
      {label && <p className="mb-2 text-xs font-bold text-slate-500">{label}</p>}
      <div className="flex justify-center gap-2" dir="ltr">
        {parts.map((p) => (
          <div key={p.l} className="min-w-16 rounded-xl border border-lav-200 bg-white px-2 py-2 text-center">
            <p className="font-amin text-2xl font-bold tabular-nums text-brand-700">{String(p.v).padStart(2, "0")}</p>
            <p className="text-[10px] text-slate-500">{p.l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
