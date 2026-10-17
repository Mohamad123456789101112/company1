"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

const KEY = "aj-zoom";
const STEPS = [70, 80, 90, 100, 110, 120, 130, 150];
/** Default page zoom on tablets & laptops – gives the layout more breathing room. */
const DEFAULT = 80;

/** Applies the zoom to <html> (CSS zoom; falls back to font-size scaling where unsupported). */
function applyZoom(pct: number) {
  const root = document.documentElement;
  const supportsZoom = typeof CSS !== "undefined" && CSS.supports?.("zoom", "1");
  if (supportsZoom) {
    root.style.setProperty("zoom", String(pct / 100));
    root.style.fontSize = "";
  } else {
    root.style.fontSize = `${pct}%`;
  }
  root.dataset.zoom = String(pct);
  try {
    localStorage.setItem(KEY, String(pct));
  } catch {
    /* ignore */
  }
}

/**
 * Floating zoom pill for tablets & laptops (hidden on phones):
 * − / + buttons, live percentage, reset, keyboard shortcuts (Ctrl/⌘ + - / + / 0),
 * remembered across pages and sessions.
 */
export function ZoomControl() {
  const [pct, setPct] = useState<number>(DEFAULT);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const set = useCallback((next: number) => {
    const clamped = Math.min(STEPS[STEPS.length - 1], Math.max(STEPS[0], next));
    setPct(clamped);
    applyZoom(clamped);
    setToast(`حجم العرض ${clamped}%`);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1200);
  }, []);

  const stepBy = useCallback(
    (dir: 1 | -1) => {
      const idx = STEPS.findIndex((s) => s >= pct);
      const cur = idx < 0 ? STEPS.length - 1 : idx;
      set(STEPS[Math.min(STEPS.length - 1, Math.max(0, cur + dir))]);
    },
    [pct, set],
  );

  useEffect(() => {
    if (!window.matchMedia("(min-width: 768px)").matches) return; // phones keep native 100%
    let initial = DEFAULT;
    try {
      const saved = Number(localStorage.getItem(KEY));
      if (saved && STEPS.includes(saved)) initial = saved;
    } catch {
      /* ignore */
    }
    setPct(initial);
    applyZoom(initial);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        stepBy(1);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        stepBy(-1);
      } else if (e.key === "0") {
        e.preventDefault();
        set(DEFAULT);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stepBy, set]);

  return (
    <>
      <div className="fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 md:block print:hidden" style={{ left: "max(0.75rem, env(safe-area-inset-left))" }}>
        <div className={cn("flex flex-col items-center gap-1 rounded-2xl border border-lav-200 bg-white/90 p-1.5 shadow-[0_12px_30px_-12px_rgba(59,39,134,0.35)] backdrop-blur-xl transition dark:bg-[var(--color-surface-2)]/90", open ? "w-12" : "w-12")}>
          <button type="button" onClick={() => setOpen((o) => !o)} className="grid size-9 place-items-center rounded-xl text-brand-600 transition hover:bg-brand-50" aria-label="تكبير / تصغير الموقع" title="تكبير / تصغير الموقع (Ctrl + / Ctrl −)">
            <ZoomIn className="size-5" />
          </button>
          <div className={cn("flex flex-col items-center gap-1 overflow-hidden transition-all duration-300", open ? "max-h-56 opacity-100" : "max-h-0 opacity-0")}>
            <button type="button" onClick={() => stepBy(1)} disabled={pct >= STEPS[STEPS.length - 1]} className="grid size-9 place-items-center rounded-xl text-slate-700 transition hover:bg-brand-50 hover:text-brand-700 disabled:opacity-30" aria-label="تكبير">
              <Plus className="size-4" strokeWidth={2.5} />
            </button>
            <button type="button" onClick={() => set(DEFAULT)} className={cn("rounded-lg px-1 py-1 font-mono text-[11px] font-black tabular-nums transition hover:bg-brand-50", pct === DEFAULT ? "text-slate-500" : "text-brand-700")} title="الحجم الافتراضي 80% (Ctrl 0)" dir="ltr">
              {pct}%
            </button>
            <button type="button" onClick={() => stepBy(-1)} disabled={pct <= STEPS[0]} className="grid size-9 place-items-center rounded-xl text-slate-700 transition hover:bg-brand-50 hover:text-brand-700 disabled:opacity-30" aria-label="تصغير">
              <Minus className="size-4" strokeWidth={2.5} />
            </button>
            {pct !== DEFAULT && (
              <button type="button" onClick={() => set(DEFAULT)} className="grid size-9 place-items-center rounded-xl text-peach-600 transition hover:bg-peach-50" aria-label="إعادة الحجم الافتراضي" title="إعادة الضبط">
                <RotateCcw className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-24 z-[70] hidden justify-center md:flex" aria-live="polite">
          <span className="rounded-full border border-lav-200 bg-white/95 px-4 py-1.5 font-amin text-sm font-bold text-brand-700 shadow-xl backdrop-blur dark:bg-[var(--color-surface-2)]/95">{toast}</span>
        </div>
      )}
    </>
  );
}
