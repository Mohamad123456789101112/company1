import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { courses, enrollments, notifications, paymentRequests, users, walletTransactions } from "@/db/schema";
import { getSettings } from "./settings";
import { getUpload } from "./uploads";
import { analyzeReceipt, DEFAULT_MODELS } from "./ai";
import type { AiProvider, AiVerdict } from "./ai-types";

/** Approve a pending request atomically: marks it approved and unlocks the course (or credits legacy wallet). */
export async function approvePaymentRequest(requestId: string, reviewerId: string | null, note: string | null): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [req] = await tx
      .update(paymentRequests)
      .set({ status: "approved", adminNote: note, reviewedBy: reviewerId, reviewedAt: new Date() })
      .where(and(eq(paymentRequests.id, requestId), eq(paymentRequests.status, "pending")))
      .returning();
    if (!req) return false;

    if (req.courseId) {
      const [course] = await tx.select().from(courses).where(eq(courses.id, req.courseId)).limit(1);
      if (course) {
        const expiresAt = course.accessDays ? new Date(Date.now() + course.accessDays * 86_400_000) : null;
        await tx
          .insert(enrollments)
          .values({ userId: req.userId, courseId: course.id, source: "purchase", pricePaid: req.amount, expiresAt })
          .onConflictDoUpdate({ target: [enrollments.userId, enrollments.courseId], set: { expiresAt, source: "purchase", pricePaid: req.amount } });
        await tx.insert(notifications).values({
          userId: req.userId,
          type: "success",
          title: "تم تفعيل الكورس 🎉",
          body: `تم تأكيد عملية الدفع وتفعيل كورس «${course.title}». ابدأ المذاكرة الآن!`,
          href: `/learn/${course.slug}`,
        });
      }
    } else {
      // Legacy wallet top-up requests
      const [u] = await tx
        .update(users)
        .set({ walletBalance: sql`${users.walletBalance} + ${req.amount}`, updatedAt: new Date() })
        .where(eq(users.id, req.userId))
        .returning({ balance: users.walletBalance });
      await tx.insert(walletTransactions).values({ userId: req.userId, amount: req.amount, type: "payment_recharge", reference: req.id, note: "شحن المحفظة – طلب دفع مؤكد", balanceAfter: u.balance });
    }
    return true;
  });
}

export async function rejectPaymentRequest(requestId: string, reviewerId: string | null, note: string | null): Promise<boolean> {
  const [req] = await db
    .update(paymentRequests)
    .set({ status: "rejected", adminNote: note, reviewedBy: reviewerId, reviewedAt: new Date() })
    .where(and(eq(paymentRequests.id, requestId), eq(paymentRequests.status, "pending")))
    .returning();
  if (!req) return false;
  await db.insert(notifications).values({
    userId: req.userId,
    type: "warning",
    title: "تعذر تأكيد عملية الدفع",
    body: note ? `سبب الرفض: ${note}. يمكنك إعادة إرسال الطلب بإيصال صحيح.` : "لم نتمكن من التحقق من التحويل. يمكنك إعادة إرسال الطلب بإيصال صحيح أو التواصل مع الدعم.",
    href: "/dashboard/purchases",
  });
  return true;
}

export function aiConfigured(s: { ai_provider: string; ai_api_key: string }): s is { ai_provider: AiProvider; ai_api_key: string } {
  return (s.ai_provider === "gemini" || s.ai_provider === "openai") && Boolean(s.ai_api_key);
}

/** Runs the configured AI model on the request's receipt and stores the verdict. Returns null when AI is not configured. */
export async function runAiOnPayment(requestId: string): Promise<AiVerdict | null> {
  const s = await getSettings();
  if (!aiConfigured(s)) return null;
  const [req] = await db.select().from(paymentRequests).where(eq(paymentRequests.id, requestId)).limit(1);
  if (!req?.receiptFileId) return null;
  const up = await getUpload(req.receiptFileId);
  if (!up || !up.mime.startsWith("image/")) return null;

  const verdict = await analyzeReceipt({
    provider: s.ai_provider,
    apiKey: s.ai_api_key,
    model: s.ai_model || DEFAULT_MODELS[s.ai_provider],
    image: { base64: Buffer.from(up.data).toString("base64"), mime: up.mime },
    expected: { amount: req.expectedAmount || req.amount, recipientNumber: s.vodafone_cash_number, reference: req.reference, senderPhone: req.senderPhone },
    minConfidence: Number(s.ai_min_confidence) || 85,
  });
  await db.update(paymentRequests).set({ aiVerdict: verdict, aiScore: verdict.score, aiCheckedAt: new Date() }).where(eq(paymentRequests.id, requestId));
  return verdict;
}

/** Convenience wrapper that swallows AI errors (the purchase must never fail because of the model). */
export async function attachAndRunAi(requestId: string): Promise<AiVerdict | null> {
  try {
    return await runAiOnPayment(requestId);
  } catch {
    return null;
  }
}

/** Auto-approval policy: strict – everything the model could read must agree with what we expect. */
export function shouldAutoApprove(v: AiVerdict | null, s: { ai_auto_approve: string }): boolean {
  if (!v || s.ai_auto_approve !== "true") return false;
  return v.valid && v.isReceipt && v.matches.amount === true && v.matches.recipient !== false && v.matches.reference !== false && v.tampering.length === 0 && !v.error;
}
