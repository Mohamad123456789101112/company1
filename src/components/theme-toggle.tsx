"use client";

import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type Theme = "light" | "dark";
export const THEME_KEY = "aj-theme";
const EVENT = "aj-theme-change";

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** Applies the theme to <html> instantly (<10ms), persists it and notifies every toggle on the page. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  // Single class switch on <html> – colors flip immediately, zero transition lag.
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage blocked */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: theme }));
}

/**
 * Pill-shaped light/dark switch.
 * - Sun on the light side, Moon on the dark side, knob slides with a springy ease.
 * - Icons cross-fade with rotate+scale; the track turns from a day-sky gradient into a night sky with tiny stars.
 * - Accessible: role="switch" + keyboard support. Light is the default theme.
 */
export function ThemeToggle({ className, size = "md" }: { className?: string; size?: "sm" | "md" }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(readTheme());
    const sync = () => setTheme(readTheme());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = readTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }, []);

  const dark = theme === "dark";
  const dims = size === "sm" ? { track: "h-8 w-[3.75rem]", knob: "size-6", travel: "translate-x-[1.75rem]", icon: "size-3.5", star: "size-1" } : { track: "h-9 w-[4.5rem]", knob: "size-7", travel: "translate-x-[2.25rem]", icon: "size-4", star: "size-1" };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "تفعيل الوضع المضيء" : "تفعيل الوضع الداكن"}
      title={dark ? "الوضع المضيء" : "الوضع الداكن"}
      onClick={toggle}
      dir="ltr"
      className={cn(
        "group relative inline-flex shrink-0 items-center rounded-full border p-1 transition-all duration-500 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-0)]",
        dims.track,
        dark
          ? "border-indigo-400/30 bg-gradient-to-r from-[#1b1a4b] via-[#241f63] to-[#0f0f2d] shadow-[inset_0_2px_6px_rgba(0,0,0,0.45),0_0_0_1px_rgba(124,92,255,0.25)]"
          : "border-sky-200 bg-gradient-to-r from-sky-100 via-sky-200 to-amber-100 shadow-[inset_0_2px_6px_rgba(14,116,144,0.15)]",
        theme === null && "opacity-0",
        className,
      )}
    >
      {/* night stars */}
      <span aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-full transition-opacity duration-500", dark ? "opacity-100" : "opacity-0")}>
        <span className={cn("absolute left-[18%] top-[28%] rounded-full bg-white/90 shadow-[0_0_6px_1px_rgba(255,255,255,0.8)]", dims.star)} />
        <span className={cn("absolute left-[34%] top-[62%] rounded-full bg-white/70", dims.star)} />
        <span className={cn("absolute left-[48%] top-[22%] rounded-full bg-white/60", dims.star)} />
        <span className="absolute left-[27%] top-[48%] size-[3px] rounded-full bg-peach-200/80" />
      </span>
      {/* day clouds */}
      <span aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-full transition-opacity duration-500", dark ? "opacity-0" : "opacity-100")}>
        <span className="absolute right-[16%] top-[55%] h-2 w-5 rounded-full bg-white/80 blur-[0.5px]" />
        <span className="absolute right-[26%] top-[38%] h-2 w-3.5 rounded-full bg-white/70" />
      </span>

      {/* faint end icons on the track */}
      <Sun aria-hidden="true" className={cn("pointer-events-none absolute left-2 transition-all duration-500", dims.icon, dark ? "opacity-0 -rotate-90 scale-50" : "opacity-0")} />
      <Moon aria-hidden="true" className={cn("pointer-events-none absolute right-2 text-indigo-200 transition-all duration-500", dims.icon, dark ? "opacity-0" : "opacity-40")} />
      <Sun aria-hidden="true" className={cn("pointer-events-none absolute left-2 text-amber-400 transition-all duration-500", dims.icon, dark ? "opacity-40" : "opacity-0")} />

      {/* knob */}
      <span
        aria-hidden="true"
        className={cn(
          "relative z-10 grid place-items-center rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.25)] transition-all duration-500 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] group-active:scale-90",
          dims.knob,
          dark ? cn(dims.travel, "bg-gradient-to-br from-indigo-200 to-indigo-400") : "translate-x-0 bg-gradient-to-br from-amber-200 to-amber-400",
        )}
      >
        <Sun className={cn("absolute text-amber-700 transition-all duration-500", dims.icon, dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100")} strokeWidth={2.5} />
        <Moon className={cn("absolute text-indigo-900 transition-all duration-500", dims.icon, dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0")} strokeWidth={2.5} />
      </span>
    </button>
  );
}
