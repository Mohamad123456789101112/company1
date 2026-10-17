import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed, short-lived media tokens.
 * The real video URL / PDF location never reaches the browser: the client only
 * gets /api/media/<token> and the server resolves + authorizes it on each request.
 *
 * token = base64url(payload) + "." + base64url(HMAC-SHA256(payload))
 */
export type MediaPayload = {
  /** lesson id */
  l: string;
  /** user id */
  u: string;
  /** kind */
  k: "video" | "pdf";
  /** expiry (unix seconds) */
  e: number;
};

function secret(): string {
  const s = process.env.MEDIA_SIGNING_SECRET || process.env.AUTH_SECRET || process.env.DATABASE_URL;
  if (!s) throw new Error("MEDIA_SIGNING_SECRET is required");
  return s;
}

const b64u = (buf: Buffer) => buf.toString("base64url");
const sign = (payload: string) => b64u(createHmac("sha256", secret()).update(payload).digest());

export function signMedia(p: Omit<MediaPayload, "e">, ttlSeconds = 60 * 60 * 3): string {
  const payload = b64u(Buffer.from(JSON.stringify({ ...p, e: Math.floor(Date.now() / 1000) + ttlSeconds })));
  return `${payload}.${sign(payload)}`;
}

export function verifyMedia(token: string): MediaPayload | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig || payload.length > 600) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as MediaPayload;
    if (!data.l || !data.u || (data.k !== "video" && data.k !== "pdf")) return null;
    if (typeof data.e !== "number" || data.e * 1000 < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}
