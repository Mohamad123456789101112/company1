"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { useAnimationPreset } from "./animation";
import type { AnimationPreset } from "@/lib/animation";

type Direction = "right" | "left" | "up" | "down" | "zoom" | "flip";
type Tag = "div" | "section" | "li" | "article" | "span";

const MOTION_TAG = {
  div: motion.div,
  section: motion.section,
  li: motion.li,
  article: motion.article,
  span: motion.span,
} as const;

/** Base entrance offsets per direction (px), matching the original CSS reveal. */
const OFFSETS: Record<Direction, { x: number; y: number; scale: number; rotateY: number }> = {
  right: { x: 80, y: 0, scale: 1, rotateY: 0 },
  left: { x: -80, y: 0, scale: 1, rotateY: 0 },
  up: { x: 0, y: 56, scale: 1, rotateY: 0 },
  down: { x: 0, y: -56, scale: 1, rotateY: 0 },
  zoom: { x: 0, y: 0, scale: 0.86, rotateY: 0 },
  flip: { x: 40, y: 0, scale: 1, rotateY: -14 },
};

function variantsFor(preset: AnimationPreset, from: Direction): Variants {
  const o = OFFSETS[from];
  switch (preset) {
    case "elastic-slide":
      return {
        hidden: { opacity: 0, x: o.x * 1.5, y: o.y * 1.5, scale: o.scale === 1 ? 0.96 : o.scale, rotateY: o.rotateY },
        show: { opacity: 1, x: 0, y: 0, scale: 1, rotateY: 0, transition: { type: "spring", stiffness: 110, damping: 13, mass: 0.9 } },
      };
    case "minimalist-scale":
      return {
        hidden: { opacity: 0, x: Math.sign(o.x) * 14, y: o.x !== 0 ? 0 : from === "down" ? -14 : 14, scale: 0.97 },
        show: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
      };
    case "cyberpunk-glow":
      return {
        hidden: { opacity: 0, x: o.x * 0.5, y: o.y === 0 ? 40 : o.y * 0.7, scale: 0.92, filter: "blur(8px)" },
        show: { opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] } },
      };
    case "smooth-fade-up":
    default:
      return {
        hidden: { opacity: 0, x: o.x, y: o.y, scale: o.scale, rotateY: o.rotateY },
        show: { opacity: 1, x: 0, y: 0, scale: 1, rotateY: 0, transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } },
      };
  }
}

/**
 * Scroll-reveal wrapper (Framer Motion). Elements animate in from the given
 * direction once they enter the viewport. `delay` (ms) staggers siblings.
 * The motion style follows the super_admin-chosen preset site-wide.
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
  as?: Tag;
  once?: boolean;
  threshold?: number;
}) {
  const preset = useAnimationPreset();
  const reduceMotion = useReducedMotion();
  const Comp = MOTION_TAG[Tag] as typeof motion.div;

  if (reduceMotion) {
    const Plain = Tag as "div";
    return <Plain className={className}>{children}</Plain>;
  }

  const variants = variantsFor(preset, from);
  const show = variants.show && typeof variants.show === "object" ? variants.show : {};
  const transition = { ...(typeof show.transition === "object" ? show.transition : {}), delay: delay / 1000 };

  return (
    <Comp
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount: Math.min(0.9, Math.max(0.05, threshold)), margin: "0px 0px -8% 0px" }}
      transition={transition}
    >
      {children}
    </Comp>
  );
}
