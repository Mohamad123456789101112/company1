import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { saveUpload, type UploadKind } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/**
 * Multipart upload endpoint (receipts for students, PDFs/images for staff).
 * Files are validated, images are re-encoded (EXIF stripped) and stored in Postgres.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const kind = request.nextUrl.searchParams.get("kind") as UploadKind | null;
  if (kind !== "receipt" && kind !== "pdf" && kind !== "image") return NextResponse.json({ error: "نوع ملف غير مدعوم" }, { status: 400 });
  if (kind !== "receipt" && !isStaff(user)) return NextResponse.json({ error: "غير مسموح" }, { status: 403 });

  const rl = await rateLimit({ key: `upload:${user.id}`, limit: 40, windowSec: 3600, blockSec: 1800 });
  if (!rl.ok) return NextResponse.json({ error: "محاولات رفع كثيرة، حاول لاحقًا" }, { status: 429 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "لم يتم اختيار ملف" }, { status: 400 });

  try {
    const res = await saveUpload({ file, kind, ownerId: user.id });
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "فشل رفع الملف" }, { status: 400 });
  }
}
