import type { SiteSettings } from "./settings";

/** Default palette – must stay in sync with `@theme` in globals.css. */
export const DEFAULT_THEME = {
  primary: "#7c5cff",
  secondary: "#ff9a62",
  bgLight: "#ffffff",
  bgDark: "#0f1020",
} as const;

export function isHexColor(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v.trim());
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mix `base` toward `target` by `t` (0 = base, 1 = target). */
function mix(base: string, target: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(base);
  const [r2, g2, b2] = hexToRgb(target);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

function scale(base: string) {
  const white = "#ffffff";
  const black = "#000000";
  return {
    50: mix(base, white, 0.93),
    100: mix(base, white, 0.85),
    200: mix(base, white, 0.68),
    300: mix(base, white, 0.5),
    400: mix(base, white, 0.28),
    500: base,
    600: mix(base, black, 0.12),
    700: mix(base, black, 0.28),
    800: mix(base, black, 0.45),
    900: mix(base, black, 0.6),
    950: mix(base, black, 0.8),
  };
}

/**
 * Builds a runtime `<style>` override for the brand/peach palettes.
 * Tailwind v4 utilities read CSS variables, so overriding them re-skins the
 * whole site with zero code changes. Returns "" when the palette equals the
 * defaults – i.e. the homepage renders pixel-identical out of the box.
 */
export function buildThemeCss(s: Pick<SiteSettings, "theme_primary" | "theme_secondary" | "theme_bg_light" | "theme_bg_dark">): string {
  const primary = isHexColor(s.theme_primary) ? s.theme_primary.trim() : DEFAULT_THEME.primary;
  const secondary = isHexColor(s.theme_secondary) ? s.theme_secondary.trim() : DEFAULT_THEME.secondary;
  const bgLight = isHexColor(s.theme_bg_light) ? s.theme_bg_light.trim() : DEFAULT_THEME.bgLight;
  const bgDark = isHexColor(s.theme_bg_dark) ? s.theme_bg_dark.trim() : DEFAULT_THEME.bgDark;

  const customPrimary = primary.toLowerCase() !== DEFAULT_THEME.primary;
  const customSecondary = secondary.toLowerCase() !== DEFAULT_THEME.secondary;
  const customBgLight = bgLight.toLowerCase() !== DEFAULT_THEME.bgLight;
  const customBgDark = bgDark.toLowerCase() !== DEFAULT_THEME.bgDark;
  if (!customPrimary && !customSecondary && !customBgLight && !customBgDark) return "";

  const b = scale(primary);
  const p = scale(secondary);
  const lines: string[] = [":root{"];
  if (customPrimary) {
    for (const k of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const) {
      lines.push(`--color-brand-${k}:${b[k]};--color-tomato-${k}:${b[k]};`);
    }
    lines.push(`--color-tomato-950:${b[950]};`);
  }
  if (customSecondary) {
    for (const k of [50, 100, 200, 300, 400, 500, 600, 700] as const) {
      lines.push(`--color-peach-${k}:${p[k]};--color-sakr-${k}:${p[k]};`);
    }
    lines.push(`--color-sakr-800:${p[800]};`);
    lines.push(`--color-accent-100:${p[100]};--color-accent-200:${p[700]};--color-accent-300:${p[600]};--color-accent-400:${p[400]};--color-accent-500:${p[500]};--color-accent-600:${p[600]};`);
  }
  lines.push("}");
  if (customBgLight) lines.push(`body{background-color:${bgLight};}`);
  if (customBgDark) lines.push(`.dark{--color-surface-0:${bgDark};--color-ink:${bgDark};}.dark body{background-color:${bgDark};}`);
  return lines.join("");
}
