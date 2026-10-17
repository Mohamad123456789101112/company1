"use client";

import { createContext, useContext, type ReactNode } from "react";
import { normalizePreset, type AnimationPreset } from "@/lib/animation";

const AnimationContext = createContext<AnimationPreset>("smooth-fade-up");

/** Provides the super_admin-chosen animation preset to every <Reveal/>. */
export function AnimationProvider({ preset, children }: { preset: string; children: ReactNode }) {
  return <AnimationContext.Provider value={normalizePreset(preset)}>{children}</AnimationContext.Provider>;
}

export function useAnimationPreset(): AnimationPreset {
  return useContext(AnimationContext);
}
