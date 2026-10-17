"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type Direction = "right" | "left" | "up" | "down" | "zoom" | "flip";

/**
 * Scroll-reveal wrapper. Elements slide in from the given direction
 * once they enter the viewport (IntersectionObserver, runs once).
 * `delay` (ms) lets you stagger siblings.
 */
export function Reveal({
  children,
  from = "up",
  delay = 0,
  className,
  as: Tag = "div",
  once = true,
  threshold = 0.18,
}: {
  children: ReactNode;
  from?: Direction;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article" | "span";
  once?: boolean;
  threshold?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("is-visible");
            if (once) io.unobserve(el);
          } else if (!once) {
            el.classList.remove("is-visible");
          }
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, threshold]);

  const style = { "--reveal-delay": `${delay}ms` } as CSSProperties;

  return (
    // @ts-expect-error – dynamic tag keeps a generic HTMLElement ref
    <Tag ref={ref} data-reveal={from} style={style} className={className}>
      {children}
    </Tag>
  );
}
