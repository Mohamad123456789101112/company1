import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";

/** Extract the real client IP behind Vercel / proxies. */
export function ipFromHeaders(h: Headers): string {
  const candidates = [
    h.get("x-vercel-forwarded-for"),
    h.get("x-forwarded-for"),
    h.get("x-real-ip"),
    h.get("cf-connecting-ip"),
  ];
  for (const c of candidates) {
    if (c) {
      const ip = c.split(",")[0]?.trim();
      if (ip) return ip.slice(0, 64);
    }
  }
  return "unknown";
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  return ipFromHeaders(h);
}

export async function getUserAgent(): Promise<string | null> {
  const h = await headers();
  return h.get("user-agent")?.slice(0, 300) ?? null;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

export function generateActivationCode(prefix = "AJ"): string {
  const buf = randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length];
    if (i === 3 || i === 7) out += "-";
  }
  return `${prefix}-${out}`;
}

export function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Prevent open redirects: only allow same-site relative paths. */
export function safeRedirectPath(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || next.includes("\n")) {
    return fallback;
  }
  if (next.startsWith("/api/") || next.startsWith("/login") || next.startsWith("/register")) return fallback;
  return next.slice(0, 200);
}

/** Simple device label from UA for the "sessions" screen. */
export function deviceLabelFromUA(ua: string | null): string {
  if (!ua) return "جهاز غير معروف";
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  let browser = "متصفح";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\//.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  let os = "";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad/.test(ua)) os = "iOS";
  else if (/Mac OS/.test(ua)) os = "macOS";
  else if (/Linux/.test(ua)) os = "Linux";
  return `${browser}${os ? ` • ${os}` : ""}${isMobile ? " • موبايل" : " • كمبيوتر"}`;
}

/** Resolve the public app URL (env first, then forwarded headers). */
export function resolveAppUrl(h: Headers): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export function isSecureContext(h: Headers): boolean {
  if (process.env.VERCEL) return true;
  if (process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://")) return true;
  return h.get("x-forwarded-proto") === "https";
}
