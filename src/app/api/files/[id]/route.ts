import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentRequests } from "@/db/schema";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { getUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/** Serves stored files with per-file authorization (owner / staff / lesson access). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const up = await getUpload(id);
  if (!up) return new NextResponse("Not found", { status: 404 });

  // Course covers are public marketing images (cacheable).
  if (up.refType === "course_cover" || up.refType === "site_image") {
    return new NextResponse(up.data as unknown as BodyInit, { headers: { "Content-Type": up.mime, "Content-Length": String(up.size), "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800", "X-Content-Type-Options": "nosniff" } });
  }

  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  // Lesson files are never served directly to students – only through the signed /api/media gateway
  // (which re-checks enrollment and applies watermark headers).
  let allowed = isStaff(user) || (up.ownerId === user.id && up.refType !== "lesson");
  if (!allowed && up.refType === "lesson") return new NextResponse("Forbidden", { status: 403 });
  if (!allowed && up.refType === "payment" && up.refId) {
    const [p] = await db.select({ userId: paymentRequests.userId }).from(paymentRequests).where(eq(paymentRequests.id, up.refId)).limit(1);
    allowed = p?.userId === user.id;
  }
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });

  const ext = up.mime === "application/pdf" ? "pdf" : up.mime === "image/png" ? "png" : up.mime === "image/webp" ? "webp" : "jpg";
  return new NextResponse(up.data as unknown as BodyInit, {
    headers: {
      "Content-Type": up.mime,
      "Content-Length": String(up.size),
      "Content-Disposition": `inline; filename="${up.kind}-${id.slice(0, 8)}.${ext}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
