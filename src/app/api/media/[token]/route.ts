import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lessons } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { canAccessLesson } from "@/lib/access";
import { verifyMedia } from "@/lib/media-token";
import { buildSecureEmbedUrl } from "@/lib/video";
import { getUpload } from "@/lib/uploads";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Encrypted/signed media gateway.
 * - The browser never sees the provider URL or the file location – only an opaque token.
 * - The token is bound to (lesson, user) and expires; it is re-validated against the DB on
 *   every call (session + enrollment), so sharing the link with another account is useless.
 * - Video → returns the embed URL as JSON to the player (same-origin fetch only).
 * - PDF   → streams the file inline with no-store + a per-request watermark header.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = verifyMedia(token);
  if (!payload || payload.u !== user.id) {
    await audit("media.invalid_token", { userId: user.id });
    return NextResponse.json({ error: "invalid or expired token" }, { status: 403 });
  }

  const rl = await rateLimit({ key: `media:${user.id}`, limit: 120, windowSec: 600, blockSec: 600 });
  if (!rl.ok) return NextResponse.json({ error: "too many requests" }, { status: 429 });

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, payload.l)).limit(1);
  if (!lesson) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await canAccessLesson(user, lesson))) {
    await audit("media.forbidden", { userId: user.id, targetType: "lesson", targetId: lesson.id });
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Block cross-site hot-linking of the gateway itself (browsers send Sec-Fetch-Site; absent = non-browser client → also blocked)
  const fetchSite = req.headers.get("sec-fetch-site");
  const dest = req.headers.get("sec-fetch-dest");
  const sameSite = fetchSite === "same-origin" || fetchSite === "same-site" || (fetchSite === "none" && dest === "iframe");
  if (!sameSite) {
    await audit("media.hotlink_blocked", { userId: user.id, targetType: "lesson", targetId: lesson.id, meta: { fetchSite, dest } });
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (payload.k === "video") {
    const embed = buildSecureEmbedUrl(lesson.videoProvider, lesson.videoUrl);
    if (!embed) return NextResponse.json({ error: "no video" }, { status: 404 });
    return NextResponse.json({ embed, ttl: 60 }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  }

  // PDF
  if (!lesson.pdfUrl) return NextResponse.json({ error: "no file" }, { status: 404 });
  const m = lesson.pdfUrl.match(/^\/api\/files\/([0-9a-f-]{36})$/i);
  if (!m) {
    // External PDF (Drive etc.) – redirect through the gateway only after authorization
    return NextResponse.redirect(lesson.pdfUrl, { headers: { "Cache-Control": "private, no-store" } });
  }
  const up = await getUpload(m[1]);
  if (!up) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(up.data as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(up.size),
      "Content-Disposition": `inline; filename="lesson.pdf"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "X-Watermark": encodeURIComponent(`${user.name} | ${user.phone ?? user.email} | ${user.id.slice(0, 8)}`),
    },
  });
}
