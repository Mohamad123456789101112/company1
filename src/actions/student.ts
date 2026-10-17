"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, count, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import {
  activationCodes,
  contactMessages,
  courseUnits,
  courses,
  enrollments,
  lessonAccess,
  lessonProgress,
  lessons,
  notifications,
  paymentRequests,
  questions,
  quizAttempts,
  quizzes,
  uploads,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { canAccessLesson, canTakeQuiz, hasCourseAccess } from "@/lib/access";
import { humanRetry, rateLimit } from "@/lib/rate-limit";
import { getClientIp, normalizeCode } from "@/lib/security";
import { centerCodeSchema, checkoutSchema, contactSchema, fieldErrors, firstError, uuidSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import { notify } from "@/lib/notify";
import { approvePaymentRequest, attachAndRunAi, shouldAutoApprove } from "@/lib/payments";
import { attachUpload } from "@/lib/uploads";
import type { ActionState } from "./auth";

export type CodeState = (NonNullable<ActionState> & { href?: string; unlocked?: string }) | null;

/* ───────────────────────── Center codes (students who are not platform subscribers) ───────────────────────── */

export async function redeemCenterCodeAction(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const user = await requireUser("/dashboard/codes");
  const parsed = centerCodeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const ip = await getClientIp();
  const perUser = await rateLimit({ key: `redeem:user:${user.id}`, limit: 5, windowSec: 900, blockSec: 1800 });
  const perIp = await rateLimit({ key: `redeem:ip:${ip}`, limit: 15, windowSec: 900, blockSec: 1800 });
  if (!perUser.ok || !perIp.ok) {
    await audit("code.rate_limited", { userId: user.id });
    return { error: `محاولات كثيرة لإدخال أكواد. حاول بعد ${humanRetry(Math.max(perUser.retryAfterSec, perIp.retryAfterSec))}.` };
  }

  const code = normalizeCode(parsed.data.code);
  const result = await db.transaction(async (tx): Promise<CodeState> => {
    // Atomic claim – only one request can ever flip is_used.
    const [claimed] = await tx
      .update(activationCodes)
      .set({ isUsed: true, usedBy: user.id, usedAt: new Date() })
      .where(
        and(
          eq(activationCodes.code, code),
          eq(activationCodes.isUsed, false),
          eq(activationCodes.type, "course"),
          or(isNull(activationCodes.expiresAt), gt(activationCodes.expiresAt, new Date())),
        ),
      )
      .returning();
    if (!claimed) return { error: "الكود غير صحيح أو تم استخدامه من قبل أو منتهي الصلاحية" };
    if (!claimed.courseId) return { error: "هذا الكود غير مرتبط بأي محتوى" };

    const [course] = await tx.select().from(courses).where(eq(courses.id, claimed.courseId)).limit(1);
    if (!course) return { error: "الكورس المرتبط بالكود غير موجود" };
    const [ownsFull] = await tx
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, course.id), or(isNull(enrollments.expiresAt), gt(enrollments.expiresAt, new Date()))))
      .limit(1);
    if (ownsFull) {
      // Give the code back – the student already owns the whole course.
      await tx.update(activationCodes).set({ isUsed: false, usedBy: null, usedAt: null }).where(eq(activationCodes.id, claimed.id));
      return { error: `أنت مشترك في كورس «${course.title}» بالكامل بالفعل ✅ – الكود لم يُستهلك ويمكنك إعطاؤه لزميل.` };
    }
    const expiresAt = claimed.amount > 0 ? new Date(Date.now() + claimed.amount * 86_400_000) : course.accessDays ? new Date(Date.now() + course.accessDays * 86_400_000) : null;

    if (claimed.scope === "course" || (!claimed.unitId && !claimed.lessonId)) {
      await tx
        .insert(enrollments)
        .values({ userId: user.id, courseId: course.id, source: "code", pricePaid: 0, expiresAt })
        .onConflictDoUpdate({ target: [enrollments.userId, enrollments.courseId], set: { expiresAt, source: "code" } });
      return { ok: true, message: `تم فتح كورس «${course.title}» بالكامل 🎉`, href: `/learn/${course.slug}`, unlocked: course.title };
    }

    if (claimed.scope === "unit" && claimed.unitId) {
      const [unit] = await tx.select().from(courseUnits).where(eq(courseUnits.id, claimed.unitId)).limit(1);
      const unitLessons = await tx.select({ id: lessons.id }).from(lessons).where(eq(lessons.unitId, claimed.unitId));
      if (!unit || unitLessons.length === 0) return { error: "لا توجد دروس في هذه الوحدة بعد" };
      await tx
        .insert(lessonAccess)
        .values(unitLessons.map((l) => ({ userId: user.id, lessonId: l.id, courseId: course.id, source: "code", codeId: claimed.id, expiresAt })))
        .onConflictDoNothing();
      return { ok: true, message: `تم فتح وحدة «${unit.title}» (${unitLessons.length} درس) من كورس «${course.title}» 🎉`, href: `/learn/${course.slug}/${unitLessons[0].id}`, unlocked: unit.title };
    }

    if (claimed.scope === "lesson" && claimed.lessonId) {
      const [lesson] = await tx.select().from(lessons).where(eq(lessons.id, claimed.lessonId)).limit(1);
      if (!lesson) return { error: "الدرس المرتبط بالكود غير موجود" };
      await tx.insert(lessonAccess).values({ userId: user.id, lessonId: lesson.id, courseId: course.id, source: "code", codeId: claimed.id, expiresAt }).onConflictDoNothing();
      return { ok: true, message: `تم فتح درس «${lesson.title}» من كورس «${course.title}» 🎉`, href: `/learn/${course.slug}/${lesson.id}`, unlocked: lesson.title };
    }
    return { error: "كود غير مكتمل البيانات – تواصل مع الدعم" };
  });

  await audit(result?.ok ? "code.redeemed" : "code.failed", { userId: user.id, meta: { code } });
  if (result?.ok) await notify(user.id, { title: "تم تفعيل كود السنتر", body: result.message ?? "", type: "course", href: result.href ?? "/dashboard" });
  revalidatePath("/dashboard", "layout");
  return result;
}

/* ───────────────────────── Free courses ───────────────────────── */

export async function enrollFreeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const courseId = uuidSchema.safeParse(formData.get("courseId"));
  if (!courseId.success) return { error: "كورس غير صالح" };
  const [course] = await db.select().from(courses).where(and(eq(courses.id, courseId.data), eq(courses.isPublished, true))).limit(1);
  if (!course) return { error: "الكورس غير متاح حاليًا" };
  const user = await requireUser(`/courses/${course.slug}`);
  if (await hasCourseAccess(user.id, course.id)) return { error: "أنت مشترك في هذا الكورس بالفعل ✅ – ادخل من «كورساتي» لمتابعة المذاكرة." };

  // Price is decided by the server only – no client input is trusted.
  const price = course.isFree ? 0 : (course.discountPrice ?? course.price);
  if (price > 0) return { error: "هذا الكورس مدفوع – أكمل عملية الشراء" };

  const rl = await rateLimit({ key: `enroll:${user.id}`, limit: 10, windowSec: 600 });
  if (!rl.ok) return { error: "محاولات كثيرة، انتظر قليلًا." };
  const expiresAt = course.accessDays ? new Date(Date.now() + course.accessDays * 86_400_000) : null;
  await db.insert(enrollments).values({ userId: user.id, courseId: course.id, source: "free", pricePaid: 0, expiresAt }).onConflictDoNothing();
  await audit("course.enrolled_free", { userId: user.id, targetType: "course", targetId: course.id });
  revalidatePath("/dashboard", "layout");
  redirect(`/learn/${course.slug}`);
}

/* ───────────────────────── Checkout (Vodafone Cash + receipt + AI verification) ───────────────────────── */

export async function submitPaymentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = checkoutSchema.safeParse({
    courseId: formData.get("courseId"),
    senderPhone: formData.get("senderPhone"),
    reference: formData.get("reference"),
    receiptFileId: formData.get("receiptFileId"),
    agree: formData.get("agree"),
  });
  if (!parsed.success) return { error: firstError(parsed.error), errors: fieldErrors(parsed.error) };
  const d = parsed.data;

  const [course] = await db.select().from(courses).where(and(eq(courses.id, d.courseId), eq(courses.isPublished, true))).limit(1);
  if (!course) return { error: "الكورس غير متاح حاليًا" };
  const user = await requireUser(`/checkout/${course.slug}`);
  if (await hasCourseAccess(user.id, course.id)) return { error: "أنت مشترك في هذا الكورس بالفعل ✅ – لا تدفع مرة أخرى. ادخل من «كورساتي» لمتابعة المذاكرة." };

  const price = course.isFree ? 0 : (course.discountPrice ?? course.price);
  if (price <= 0) return { error: "هذا الكورس مجاني – فعّله مباشرة من صفحة الكورس" };

  const rl = await rateLimit({ key: `checkout:${user.id}`, limit: 6, windowSec: 3600, blockSec: 3600 });
  if (!rl.ok) return { error: `محاولات دفع كثيرة. حاول بعد ${humanRetry(rl.retryAfterSec)}.` };

  const [pending] = await db
    .select({ id: paymentRequests.id })
    .from(paymentRequests)
    .where(and(eq(paymentRequests.userId, user.id), eq(paymentRequests.courseId, course.id), eq(paymentRequests.status, "pending")))
    .limit(1);
  if (pending) return { error: "لديك طلب قيد المراجعة لهذا الكورس بالفعل. تابع حالته من صفحة مشترياتي." };

  const [up] = await db
    .select({ id: uploads.id, kind: uploads.kind, ownerId: uploads.ownerId })
    .from(uploads)
    .where(and(eq(uploads.id, d.receiptFileId), eq(uploads.ownerId, user.id), eq(uploads.kind, "receipt")))
    .limit(1);
  if (!up) return { error: "ارفع صورة إيصال التحويل أولًا", errors: { receiptFileId: "مطلوب" } };

  const s = await getSettings();
  if (!s.vodafone_cash_number) return { error: "لم يتم ضبط رقم الاستلام بعد – تواصل مع الدعم" };

  const [req] = await db
    .insert(paymentRequests)
    .values({
      userId: user.id,
      courseId: course.id,
      method: "vodafone_cash",
      amount: price,
      expectedAmount: price,
      senderPhone: d.senderPhone,
      reference: d.reference,
      receiptFileId: up.id,
      receiptUrl: `/api/files/${up.id}`,
    })
    .returning({ id: paymentRequests.id });
  await attachUpload(up.id, "payment", req.id);
  await audit("payment.requested", { userId: user.id, targetType: "payment", targetId: req.id, meta: { amount: price, courseId: course.id } });

  // AI verification (never blocks the flow on failure)
  let autoApproved = false;
  const verdict = await attachAndRunAi(req.id);
  if (shouldAutoApprove(verdict, s)) {
    autoApproved = await approvePaymentRequest(req.id, null, `تحقق آلي بالذكاء الاصطناعي (درجة الثقة ${verdict?.score}%)`);
    if (autoApproved) await audit("payment.auto_approved", { userId: user.id, targetType: "payment", targetId: req.id, meta: { score: verdict?.score } });
  }
  if (!autoApproved) {
    await notify(user.id, { title: "تم استلام طلب الدفع", body: `طلب شراء كورس «${course.title}» قيد المراجعة وسيتم تفعيله فور التأكد من التحويل.`, type: "payment", href: "/dashboard/purchases" });
  }

  revalidatePath("/dashboard", "layout");
  redirect(autoApproved ? `/learn/${course.slug}?activated=1` : `/dashboard/purchases?submitted=1`);
}

/* ───────────────────────── Lesson progress ───────────────────────── */

export async function markLessonCompleteAction(formData: FormData) {
  const lessonId = uuidSchema.safeParse(formData.get("lessonId"));
  if (!lessonId.success) return;
  const user = await requireUser("/dashboard");
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId.data)).limit(1);
  if (!lesson) return;
  if (!(await canAccessLesson(user, lesson))) return;

  await db.insert(lessonProgress).values({ userId: user.id, lessonId: lesson.id, courseId: lesson.courseId }).onConflictDoNothing();
  const [course] = await db.select({ slug: courses.slug }).from(courses).where(eq(courses.id, lesson.courseId)).limit(1);
  if (course) revalidatePath(`/learn/${course.slug}/${lesson.id}`);
  revalidatePath("/dashboard", "layout");
}

/* ───────────────────────── Quizzes ───────────────────────── */

export async function startQuizAction(formData: FormData) {
  const quizId = uuidSchema.safeParse(formData.get("quizId"));
  if (!quizId.success) return;
  const user = await requireUser("/dashboard");

  const [quiz] = await db.select().from(quizzes).where(and(eq(quizzes.id, quizId.data), eq(quizzes.isPublished, true))).limit(1);
  if (!quiz) return;

  const lessonRow = quiz.lessonId ? (await db.select().from(lessons).where(eq(lessons.id, quiz.lessonId)).limit(1))[0] ?? null : null;
  const gate = await canTakeQuiz(user, quiz, lessonRow);
  if (!gate.ok) {
    if (gate.reason === "prerequisite") redirect(`/quiz/${quiz.id}?error=prerequisite`);
    const [c] = await db.select({ slug: courses.slug }).from(courses).where(eq(courses.id, quiz.courseId)).limit(1);
    redirect(c ? `/courses/${c.slug}?locked=1&exam=1` : "/dashboard");
  }

  const now = Date.now();
  if (quiz.availableFrom && now < quiz.availableFrom.getTime()) redirect(`/quiz/${quiz.id}?error=not_open`);
  if (quiz.availableUntil && now > quiz.availableUntil.getTime()) redirect(`/quiz/${quiz.id}?error=closed`);

  // Resume an open attempt (or expire it if its time ran out)
  const [open] = await db
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.quizId, quiz.id), eq(quizAttempts.userId, user.id), eq(quizAttempts.status, "in_progress")))
    .limit(1);
  if (open) {
    const deadline = Math.min(open.startedAt.getTime() + quiz.durationMinutes * 60_000, quiz.availableUntil?.getTime() ?? Infinity) + 45_000;
    if (now <= deadline) redirect(`/quiz/${quiz.id}/attempt/${open.id}`);
    await db.update(quizAttempts).set({ status: "cancelled", cancelReason: "timeout", submittedAt: new Date() }).where(eq(quizAttempts.id, open.id));
  }

  const [used] = await db.select({ c: count() }).from(quizAttempts).where(and(eq(quizAttempts.quizId, quiz.id), eq(quizAttempts.userId, user.id)));
  if ((used?.c ?? 0) >= quiz.maxAttempts) redirect(`/quiz/${quiz.id}?error=max_attempts`);

  const [attempt] = await db.insert(quizAttempts).values({ quizId: quiz.id, userId: user.id, status: "in_progress" }).returning({ id: quizAttempts.id });
  await audit("quiz.started", { userId: user.id, targetType: "quiz", targetId: quiz.id });
  redirect(`/quiz/${quiz.id}/attempt/${attempt.id}`);
}

export async function submitQuizAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const attemptId = uuidSchema.safeParse(formData.get("attemptId"));
  if (!attemptId.success) return { error: "محاولة غير صالحة" };
  const user = await requireUser("/dashboard");

  const [attempt] = await db.select().from(quizAttempts).where(and(eq(quizAttempts.id, attemptId.data), eq(quizAttempts.userId, user.id))).limit(1);
  if (!attempt) return { error: "المحاولة غير موجودة" };
  if (attempt.status !== "in_progress") redirect(`/quiz/${attempt.quizId}/result/${attempt.id}`);

  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, attempt.quizId)).limit(1);
  if (!quiz) return { error: "الامتحان غير موجود" };

  const deadline = Math.min(attempt.startedAt.getTime() + quiz.durationMinutes * 60_000, quiz.availableUntil?.getTime() ?? Infinity) + 45_000;
  const timedOut = Date.now() > deadline;

  let answers: Record<string, number> = {};
  try {
    const raw = JSON.parse(String(formData.get("answers") ?? "{}")) as unknown;
    if (raw && typeof raw === "object") {
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 6) answers[k] = v;
      }
    }
  } catch {
    answers = {};
  }
  if (timedOut && Date.now() > deadline + 5 * 60_000) answers = {}; // far too late – nothing counts

  const qs = await db.select().from(questions).where(eq(questions.quizId, quiz.id));
  let score = 0;
  let total = 0;
  for (const q of qs) {
    total += q.points;
    if (answers[q.id] === q.correctIndex) score += q.points;
  }
  const percent = total ? Math.round((score / total) * 100) : 0;

  await db
    .update(quizAttempts)
    .set({ answers, score, total, percent, passed: percent >= quiz.passPercent, status: "submitted", submittedAt: new Date() })
    .where(and(eq(quizAttempts.id, attempt.id), eq(quizAttempts.status, "in_progress")));

  if (quiz.lessonId) {
    await db.insert(lessonProgress).values({ userId: user.id, lessonId: quiz.lessonId, courseId: quiz.courseId }).onConflictDoNothing();
  }
  await audit("quiz.submitted", { userId: user.id, targetType: "quiz", targetId: quiz.id, meta: { percent } });
  revalidatePath("/dashboard", "layout");
  redirect(`/quiz/${quiz.id}/result/${attempt.id}`);
}

/* ───────────────────────── Notifications ───────────────────────── */

export async function markNotificationsReadAction() {
  const user = await requireUser("/dashboard");
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));
  revalidatePath("/dashboard", "layout");
}

/* ───────────────────────── Contact ───────────────────────── */

export async function contactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    message: formData.get("message"),
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (parsed.data.website) return { ok: true, message: "تم إرسال رسالتك" };

  const ip = await getClientIp();
  const rl = await rateLimit({ key: `contact:${ip}`, limit: 3, windowSec: 3600, blockSec: 3600 });
  if (!rl.ok) return { error: "تم إرسال رسائل كثيرة. حاول لاحقًا." };

  await db.insert(contactMessages).values({ name: parsed.data.name, phone: parsed.data.phone, message: parsed.data.message, ip });
  return { ok: true, message: "تم إرسال رسالتك بنجاح وسنتواصل معك قريبًا" };
}
