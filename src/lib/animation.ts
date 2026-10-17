/**
 * Animation engine presets (Framer Motion).
 * The super_admin picks one preset from the dashboard and it applies
 * site-wide with zero code changes. `smooth-fade-up` is the default and
 * matches the original reveal timing exactly.
 */
export const ANIMATION_PRESETS = ["smooth-fade-up", "elastic-slide", "minimalist-scale", "cyberpunk-glow"] as const;

export type AnimationPreset = (typeof ANIMATION_PRESETS)[number];

export const ANIMATION_PRESET_LABELS: Record<AnimationPreset, { label: string; hint: string }> = {
  "smooth-fade-up": { label: "Smooth Fade-Up", hint: "صعود ناعم مع تلاشي – الافتراضي" },
  "elastic-slide": { label: "Elastic Slide", hint: "انزلاق مرن بنابض فيزيائي" },
  "minimalist-scale": { label: "Minimalist Scale", hint: "تكبير هادئ بسيط" },
  "cyberpunk-glow": { label: "Cyberpunk Glow", hint: "ظهور متوهج بأسلوب سايبر" },
};

export function normalizePreset(v: string | null | undefined): AnimationPreset {
  return (ANIMATION_PRESETS as readonly string[]).includes(v ?? "") ? (v as AnimationPreset) : "smooth-fade-up";
}
