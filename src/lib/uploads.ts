import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { uploads } from "@/db/schema";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel request limit is 4.5 MB
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export type UploadKind = "receipt" | "pdf" | "image";

/** Re-encode images (strip metadata, cap size) – keeps the DB small and removes EXIF. */
async function processImage(buf: Buffer, mime: string): Promise<{ buf: Buffer; mime: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(buf).rotate().resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
    return { buf: out, mime: "image/jpeg" };
  } catch {
    return { buf, mime };
  }
}

export async function saveUpload(opts: { file: File; kind: UploadKind; ownerId: string | null; refType?: string; refId?: string }) {
  const { file, kind } = opts;
  if (file.size <= 0) throw new Error("الملف فارغ");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("حجم الملف أكبر من 4 ميجابايت");
  const mime = file.type;
  if (kind === "pdf") {
    if (mime !== "application/pdf") throw new Error("الملف يجب أن يكون بصيغة PDF");
  } else if (!IMAGE_TYPES.has(mime)) {
    throw new Error("الصورة يجب أن تكون JPG أو PNG أو WEBP");
  }

  let buf: Buffer = Buffer.from(new Uint8Array(await file.arrayBuffer()));
  let finalMime = mime;
  if (kind === "pdf") {
    if (buf.subarray(0, 4).toString("latin1") !== "%PDF") throw new Error("ملف PDF غير صالح");
  } else {
    const r = await processImage(buf, mime);
    buf = r.buf;
    finalMime = r.mime;
  }

  const [row] = await db
    .insert(uploads)
    .values({ kind, mime: finalMime, size: buf.length, data: buf, ownerId: opts.ownerId, refType: opts.refType ?? null, refId: opts.refId ?? null })
    .returning({ id: uploads.id });
  return { id: row.id, mime: finalMime, size: buf.length, url: `/api/files/${row.id}` };
}

export async function getUpload(id: string) {
  const [row] = await db.select().from(uploads).where(eq(uploads.id, id)).limit(1);
  return row ?? null;
}

export async function getUploadMeta(id: string) {
  const [row] = await db
    .select({ id: uploads.id, kind: uploads.kind, mime: uploads.mime, size: uploads.size, ownerId: uploads.ownerId, refType: uploads.refType, refId: uploads.refId })
    .from(uploads)
    .where(eq(uploads.id, id))
    .limit(1);
  return row ?? null;
}

export async function attachUpload(id: string, refType: string, refId: string) {
  await db.update(uploads).set({ refType, refId }).where(eq(uploads.id, id));
}

export function fileIdFromUrl(url: string | null | undefined): string | null {
  const m = url?.match(/^\/api\/files\/([0-9a-f-]{36})$/i);
  return m ? m[1] : null;
}
