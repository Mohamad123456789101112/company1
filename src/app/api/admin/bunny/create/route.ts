import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Step 1 of a direct-to-Bunny upload (staff only):
 * creates the video object in the teacher's Bunny Stream library and returns
 * presigned TUS credentials so the browser uploads straight to Bunny.
 * The Stream API key never leaves the server.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const rl = await rateLimit({ key: `bunny:create:${user.id}`, limit: 60, windowSec: 3600 });
  if (!rl.ok) return NextResponse.json({ error: "محاولات كثيرة" }, { status: 429 });

  const s = await getSettings();
  if (!s.bunny_library_id || !s.bunny_api_key) return NextResponse.json({ error: "لم يتم ضبط Bunny Stream بعد – اضبطه من إعدادات الفيديو" }, { status: 400 });

  let title = "فيديو جديد";
  try {
    const body = (await request.json()) as { title?: string };
    if (body.title && typeof body.title === "string") title = body.title.slice(0, 120);
  } catch {
    /* default title */
  }

  const res = await fetch(`https://video.bunnycdn.com/library/${encodeURIComponent(s.bunny_library_id)}/videos`, {
    method: "POST",
    headers: { AccessKey: s.bunny_api_key, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return NextResponse.json({ error: `تعذر إنشاء الفيديو في Bunny (HTTP ${res.status}) ${txt.slice(0, 120)}` }, { status: 502 });
  }
  const video = (await res.json()) as { guid: string };
  const expires = Math.floor(Date.now() / 1000) + 6 * 3600;
  const signature = createHash("sha256").update(`${s.bunny_library_id}${s.bunny_api_key}${expires}${video.guid}`).digest("hex");
  await audit("admin.video_upload_started", { userId: user.id, meta: { videoId: video.guid, title } });

  return NextResponse.json({
    videoId: video.guid,
    libraryId: s.bunny_library_id,
    signature,
    expires,
    endpoint: "https://video.bunnycdn.com/tusupload",
    embedUrl: `https://iframe.mediadelivery.net/embed/${s.bunny_library_id}/${video.guid}`,
  });
}
