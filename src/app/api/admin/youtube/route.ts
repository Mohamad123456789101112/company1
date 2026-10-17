import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { extractYouTubeId } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * YouTube auto-fetch: given a link, returns the lesson title, duration (seconds)
 * and thumbnail automatically – so the teacher only pastes the URL.
 * Sources (no API key needed):
 *   1. oEmbed           → title + thumbnail
 *   2. watch page meta  → lengthSeconds (duration)
 */
async function fetchJson(url: string, ms = 7000): Promise<Record<string, unknown> | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; EdPlatform/1.0)" } });
    clearTimeout(t);
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function fetchText(url: string, ms = 7000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; EdPlatform/1.0)", "Accept-Language": "en" } });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "assistant")) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = extractYouTubeId(searchParams.get("url") ?? searchParams.get("id") ?? "");
  if (!id) {
    return NextResponse.json({ ok: false, error: "invalid_url" }, { status: 400 });
  }

  const watchUrl = `https://www.youtube.com/watch?v=${id}`;
  const [oembed, page] = await Promise.all([
    fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`),
    fetchText(watchUrl),
  ]);

  const title = typeof oembed?.title === "string" ? oembed.title : null;
  const thumbnail =
    typeof oembed?.thumbnail_url === "string" ? oembed.thumbnail_url : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  let durationSeconds: number | null = null;
  if (page) {
    const ls = page.match(/"lengthSeconds"\s*:\s*"(\d+)"/);
    if (ls?.[1]) durationSeconds = Number(ls[1]);
    if (durationSeconds == null) {
      const iso = page.match(/itemprop="duration"\s+content="PT(?:(\d+)M)?(\d+)S"/);
      if (iso?.[2]) durationSeconds = Number(iso[1] ?? 0) * 60 + Number(iso[2]);
    }
    if (durationSeconds == null) {
      const approx = page.match(/"approxDurationMs"\s*:\s*"(\d+)"/);
      if (approx?.[1]) durationSeconds = Math.round(Number(approx[1]) / 1000);
    }
  }

  return NextResponse.json({
    ok: Boolean(title) || durationSeconds != null,
    id,
    title,
    durationSeconds,
    thumbnail,
  });
}
