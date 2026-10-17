import "server-only";
import { createHash } from "node:crypto";
import { buildEmbedUrl, type VideoProvider } from "./utils";
import { platformConfig } from "./config";

/**
 * Server-only embed URL builder.
 * - Bunny Stream: when BUNNY_TOKEN_AUTH_KEY is configured, embeds are signed
 *   (token = sha256(key + videoId + expires)) and expire after 3 hours, so the
 *   iframe URL cannot be shared or hot-linked.
 * - Other providers fall back to the privacy-enhanced embed URL.
 */
export function buildSecureEmbedUrl(provider: VideoProvider | null, url: string | null): string | null {
  if (provider === "bunny" && url) {
    const key = platformConfig.bunny.tokenAuthKey;
    const m = url.match(/iframe\.mediadelivery\.net\/(?:embed|play)\/(\d+)\/([A-Za-z0-9-]+)/);
    if (key && m) {
      const expires = Math.floor(Date.now() / 1000) + 3 * 3600;
      const token = createHash("sha256").update(`${key}${m[2]}${expires}`).digest("hex");
      return `https://iframe.mediadelivery.net/embed/${m[1]}/${m[2]}?token=${token}&expires=${expires}&autoplay=false&preload=true`;
    }
  }
  return buildEmbedUrl(provider, url);
}
