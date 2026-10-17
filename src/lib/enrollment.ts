import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { enrollments, paymentRequests } from "@/db/schema";

const SOURCE_LABEL: Record<string, string> = {
  purchase: "شراء مؤكد (فودافون كاش)",
  wallet: "شراء",
  free: "كورس مجاني",
  code: "كود سنتر",
  admin: "تفعيل من الإدارة",
};

/** Active enrollment details for the "already subscribed" UX. */
export async function getEnrollmentInfo(userId: string, courseId: string) {
  const [e] = await db.select().from(enrollments).where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId))).orderBy(desc(enrollments.createdAt)).limit(1);
  if (!e) return null;
  const now = Date.now();
  const active = !e.expiresAt || e.expiresAt.getTime() > now;
  return {
    ...e,
    active,
    sourceLabel: SOURCE_LABEL[e.source] ?? e.source,
    daysLeft: e.expiresAt ? Math.max(0, Math.ceil((e.expiresAt.getTime() - now) / 86_400_000)) : null,
  };
}

/** A payment request for this course that is still waiting for the teacher. */
export async function getPendingPaymentFor(userId: string, courseId: string) {
  const [p] = await db
    .select({ id: paymentRequests.id, createdAt: paymentRequests.createdAt, reference: paymentRequests.reference, amount: paymentRequests.amount })
    .from(paymentRequests)
    .where(and(eq(paymentRequests.userId, userId), eq(paymentRequests.courseId, courseId), eq(paymentRequests.status, "pending")))
    .limit(1);
  return p ?? null;
}
