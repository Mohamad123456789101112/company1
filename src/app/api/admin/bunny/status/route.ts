import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const STATUS: Record<number, string> = { 0: "في الانتظار", 1: "تم الرفع", 2: "جارٍ المعالجة", 3: "جارٍ الترميز", 4: "جاهز ✓", 5: "فشل", 6: "جارٍ الرفع", 7: "جارٍ المعالجة", 8: "جارٍ المعالجة" };

/** Encoding status of a Bunny video (staff only) – lets the editor show "ready" after upload. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const s = await getSettings();
  if (!s.bunny_library_id || !s.bunny_api_key) return NextResponse.json({ error: "not configured" }, { status: 400 });
  const res = await fetch(`https://video.bunnycdn.com/library/${encodeURIComponent(s.bunny_library_id)}/videos/${id}`, { headers: { AccessKey: s.bunny_api_key, Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) return NextResponse.json({ error: `HTTP ${res.status}` }, { status: 502 });
  const v = (await res.json()) as { status: number; length: number; encodeProgress: number; thumbnailFileName?: string };
  return NextResponse.json({ status: v.status, label: STATUS[v.status] ?? String(v.status), ready: v.status === 4, progress: v.encodeProgress, durationSec: v.length, thumbnail: s.bunny_cdn_hostname && v.thumbnailFileName ? `https://${s.bunny_cdn_hostname}/${id}/${v.thumbnailFileName}` : null });
}
