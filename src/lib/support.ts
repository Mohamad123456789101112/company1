import "server-only";
import { cache } from "react";
import { db, dbReady } from "@/db";
import { supportSettings } from "@/db/schema";

export type SupportChannel = "whatsapp" | "telegram" | "both";

export type SupportConfig = {
  enabled: boolean;
  channels: SupportChannel;
  whatsapp: string;
  telegram: string;
  welcomeMessage: string;
};

export const DEFAULT_SUPPORT: SupportConfig = {
  enabled: true,
  channels: "both",
  whatsapp: "",
  telegram: "",
  welcomeMessage: "السلام عليكم، عندي استفسار بخصوص المنصة",
};

function normalizeChannels(v: string | null | undefined): SupportChannel {
  return v === "whatsapp" || v === "telegram" || v === "both" ? v : "both";
}

/**
 * Floating support-button config (single-row table, id = 'default').
 * Editable by teacher_admin + super_admin. Falls back to safe defaults so
 * the site keeps rendering when the table/row is missing.
 */
export const getSupportSettings = cache(async (): Promise<SupportConfig> => {
  try {
    await dbReady;
    const rows = await db.select().from(supportSettings).limit(1);
    const row = rows[0];
    if (!row) return { ...DEFAULT_SUPPORT };
    return {
      enabled: row.enabled,
      channels: normalizeChannels(row.channels),
      whatsapp: (row.whatsapp ?? "").trim(),
      telegram: (row.telegram ?? "").trim(),
      welcomeMessage: row.welcomeMessage?.trim() || DEFAULT_SUPPORT.welcomeMessage,
    };
  } catch {
    return { ...DEFAULT_SUPPORT };
  }
});

/** wa.me / t.me links with the teacher's welcome message prefilled. */
export function supportLinks(cfg: SupportConfig): { whatsapp?: string; telegram?: string } {
  const out: { whatsapp?: string; telegram?: string } = {};
  const digits = cfg.whatsapp.replace(/\D/g, "");
  if ((cfg.channels === "whatsapp" || cfg.channels === "both") && digits.length >= 10) {
    out.whatsapp = `https://wa.me/${digits}?text=${encodeURIComponent(cfg.welcomeMessage)}`;
  }
  const tg = cfg.telegram.trim().replace(/^@+/, "").replace(/^https?:\/\/(t\.me|telegram\.me)\//i, "").replace(/\/+$/, "");
  if ((cfg.channels === "telegram" || cfg.channels === "both") && tg) {
    out.telegram = `https://t.me/${tg}?text=${encodeURIComponent(cfg.welcomeMessage)}`;
  }
  return out;
}
