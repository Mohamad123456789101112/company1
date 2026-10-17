"use server";

import { requireStaff } from "@/lib/auth";
import { extractYouTubeId } from "@/lib/utils";

export type YouTubeMeta = {
  ok: boolean;
  id?: string;
  title?: string;
  durationMinutes?: number;
  thumbnail?: string;
  author?: string;
  error?: string;
};

/** "PT1H2M10S" → 63 (minutes, rounded up so a 20:30 video counts as 21) */
function isoDurationToMinutes(iso: string | undefined | null): number | undefined {
  if (!iso) return undefined;
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!m) return undefined;
  const total = Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) + Number(m[4] ?? 0) / 60;
  if (!Number.isFinite(total) || total <= 0) return undefined;
  return Math.max(1, Math.round(total));
}

/**
 * YouTube Auto-Fetch: called by the lesson form the moment a link is pasted.
 * Pulls the video title, duration and thumbnail so the teacher never types them.
 *
 * Two public sources, no API key needed:
 *  1) oEmbed  → title + author + thumbnail (works for unlisted/public videos)
 *  2) Player page microdata (lengthSeconds) → exact duration
 * Optional: setting YOUTUBE_API_KEY in .env gives a 100% reliable duration.
 */
export async function fetchYouTubeMetaAction(url: string): Promise<YouTubeMeta> {
  await requireStaff();
  const id = extractYouTubeId((url ?? "").trim());
  if (!id) return { ok: false, error: "رابط يوتيوب غير صالح – انسخه من زر «مشاركة» في يوتيوب" };
  const thumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  let title: string | undefined;
  let author: string | undefined;

  // 1) Official oEmbed endpoint
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
      title = data.title?.trim();
      author = data.author_name?.trim();
      if (data.thumbnail_url) return finish(id, title, author, undefined, data.thumbnail_url.replace(/^http:/, "https:"));
    }
  } catch {
    /* network / blocked – fall back to the player page */
  }

  // 2) Player page → duration (+ title fallback)
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${id}&hl=ar`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LMS/1.0)", "Accept-Language": "ar,en;q=0.8" },
    });
    if (res.ok) {
      const html = await res.text();
      const len = html.match(/"lengthSeconds":"(\d+)"/)?.[1];
      const durationMinutes = len ? Math.max(1, Math.round(Number(len) / 60)) : undefined;
      const t = html.match(/<meta\s+name="title"\s+content="([^"]+)"/)?.[1] ?? html.match(/"title":"((?:[^"\\]|\\.)*)"/)?.[1];
      if (!title && t) title = t.replace(/\\u([\da-f]{4})/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16))).replace(/\s*-\s*YouTube\s*$/, "").trim();
      const a = html.match(/"ownerChannelName":"((?:[^"\\]|\\.)*)"/)?.[1];
      if (!author && a) author = a.trim();
      return finish(id, title, author, durationMinutes, thumbnail);
    }
  } catch {
    /* ignore */
  }

  if (title) return finish(id, title, author, undefined, thumbnail);
  return { ok: false, id, thumbnail, error: "تم التعرف على الفيديو لكن يوتيوب لم يسمح بجلب بياناته الآن – اكتب العنوان والمدة يدويًا" };
}

function finish(id: string, title: string | undefined, author: string | undefined, durationMinutes: number | undefined, thumbnail: string): YouTubeMeta {
  return { ok: true, id, title: title || undefined, author: author || undefined, durationMinutes, thumbnail };
}
