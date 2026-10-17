"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activationCodes,
  announcements,
  contactMessages,
  courseUnits,
  courses,
  enrollments,
  lessonAccess,
  lessons,
  notifications,
  paymentRequests,
  questions,
  quizzes,
  sessions,
  settings,
  testimonials,
  users,
} from "@/db/schema";
import { hashPassword, requireAdmin, requireStaff } from "@/lib/auth";
import { generateActivationCode } from "@/lib/security";
import { extractYouTubeId, parseLocalDateTime, slugify } from "@/lib/utils";
import { DEFAULT_SETTINGS, getSettings, type SettingsKey } from "@/lib/settings";
import {
  adminResetPasswordSchema,
  aiSettingsSchema,
  announcementSchema,
  bulkQuestionsSchema,
  courseSchema,
  enrollStudentSchema,
  fieldErrors,
  firstError,
  generateCodesSchema,
  lessonSchema,
  questionSchema,
  quizSchema,
  quizJsonSchema,
  standaloneQuizSchema,
  testimonialSchema,
  unitSchema,
  uuidSchema,
} from "@/lib/validators";
import { audit } from "@/lib/audit";
import { approvePaymentRequest, rejectPaymentRequest, runAiOnPayment } from "@/lib/payments";
import { attachUpload, fileIdFromUrl } from "@/lib/uploads";
import { pingAi, DEFAULT_MODELS } from "@/lib/ai";
import { extractQuestions, pickField, type RawQuestion } from "@/lib/quiz-json";
import { notify } from "@/lib/notify";
import type { ActionState } from "./auth";

export type AdminState = (NonNullable<ActionState> & { codes?: string[] }) | null;

const bool = (fd: FormData, key: string) => fd.get(key) === "on" || fd.get(key) === "true";
const str = (fd: FormData, key: string) => (fd.get(key) ?? "") as string;

function revalidateAdmin(...paths: string[]) {
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  revalidatePath("/courses");
  for (const p of paths) revalidatePath(p);
}

/* ───────────────────────── Courses ───────────────────────── */

function courseInput(fd: FormData) {
  return {
    title: str(fd, "title"),
    description: str(fd, "description"),
    grade: str(fd, "grade"),
    price: str(fd, "price") || "0",
    discountPrice: str(fd, "discountPrice"),
    coverImage: str(fd, "coverImage"),
    isPublished: bool(fd, "isPublished"),
    isFree: bool(fd, "isFree"),
    isFeatured: bool(fd, "isFeatured"),
    accessDays: str(fd, "accessDays"),
    orderIndex: str(fd, "orderIndex") || "0",
  };
}

/** Uploaded cover (via /api/upload?kind=image) wins over a pasted URL. */
function resolveCover(fd: FormData, pasted: string | undefined) {
  const fileId = uuidSchema.safeParse(fd.get("coverFileId"));
  if (fileId.success) return { url: `/api/files/${fileId.data}`, fileId: fileId.data };
  return { url: pasted || null, fileId: null };
}

export async function createCourseAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const staff = await requireStaff();
  const parsed = courseSchema.safeParse(courseInput(fd));
  if (!parsed.success) return { error: firstError(parsed.error), errors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const cover = resolveCover(fd, d.coverImage);
  const [created] = await db
    .insert(courses)
    .values({
      title: d.title,
      slug: slugify(d.title),
      description: d.description || "",
      grade: d.grade,
      price: d.price,
      discountPrice: d.discountPrice === "" || d.discountPrice === undefined ? null : d.discountPrice,
      coverImage: cover.url,
      isPublished: Boolean(d.isPublished),
      isFree: Boolean(d.isFree),
      isFeatured: Boolean(d.isFeatured),
      accessDays: d.accessDays === "" || d.accessDays === undefined || d.accessDays === 0 ? null : d.accessDays,
      orderIndex: d.orderIndex ?? 0,
    })
    .returning({ id: courses.id });
  if (cover.fileId) await attachUpload(cover.fileId, "course_cover", created.id);
  await audit("admin.course_created", { userId: staff.id, targetType: "course", targetId: created.id });
  revalidateAdmin("/admin/courses");
  redirect(`/admin/courses/${created.id}`);
}

export async function updateCourseAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const staff = await requireStaff();
  const id = uuidSchema.safeParse(fd.get("courseId"));
  if (!id.success) return { error: "كورس غير صالح" };
  const parsed = courseSchema.safeParse(courseInput(fd));
  if (!parsed.success) return { error: firstError(parsed.error), errors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const cover = resolveCover(fd, d.coverImage);
  if (cover.fileId) await attachUpload(cover.fileId, "course_cover", id.data);
  await db
    .update(courses)
    .set({
      title: d.title,
      description: d.description || "",
      grade: d.grade,
      price: d.price,
      discountPrice: d.discountPrice === "" || d.discountPrice === undefined ? null : d.discountPrice,
      coverImage: cover.url,
      isPublished: Boolean(d.isPublished),
      isFree: Boolean(d.isFree),
      isFeatured: Boolean(d.isFeatured),
      accessDays: d.accessDays === "" || d.accessDays === undefined || d.accessDays === 0 ? null : d.accessDays,
      orderIndex: d.orderIndex ?? 0,
      updatedAt: new Date(),
    })
    .where(eq(courses.id, id.data));
  await audit("admin.course_updated", { userId: staff.id, targetType: "course", targetId: id.data });
  revalidateAdmin("/admin/courses", `/admin/courses/${id.data}`);
  return { ok: true, message: "تم حفظ الكورس" };
}

export async function deleteCourseAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = uuidSchema.safeParse(fd.get("courseId"));
  if (!id.success) return;
  await db.delete(courses).where(eq(courses.id, id.data));
  await audit("admin.course_deleted", { userId: admin.id, targetType: "course", targetId: id.data });
  revalidateAdmin("/admin/courses");
  redirect("/admin/courses");
}

/* ───────────────────────── Units ───────────────────────── */

export async function createUnitAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  await requireStaff();
  const parsed = unitSchema.safeParse({ courseId: fd.get("courseId"), title: fd.get("title"), description: str(fd, "description"), orderIndex: str(fd, "orderIndex") || "0" });
  if (!parsed.success) return { error: firstError(parsed.error) };
  await db.insert(courseUnits).values({ courseId: parsed.data.courseId, title: parsed.data.title, description: parsed.data.description || null, orderIndex: parsed.data.orderIndex ?? 0 });
  revalidateAdmin(`/admin/courses/${parsed.data.courseId}`);
  return { ok: true, message: "تمت إضافة الوحدة" };
}

export async function deleteUnitAction(fd: FormData) {
  await requireStaff();
  const id = uuidSchema.safeParse(fd.get("unitId"));
  const courseId = uuidSchema.safeParse(fd.get("courseId"));
  if (!id.success || !courseId.success) return;
  await db.delete(courseUnits).where(and(eq(courseUnits.id, id.data), eq(courseUnits.courseId, courseId.data)));
  revalidateAdmin(`/admin/courses/${courseId.data}`);
}

/* ───────────────────────── Lessons (with PDF upload) ───────────────────────── */

function lessonInput(fd: FormData) {
  return {
    courseId: fd.get("courseId"),
    unitId: fd.get("unitId"),
    title: fd.get("title"),
    description: str(fd, "description"),
    type: fd.get("type"),
    videoProvider: str(fd, "videoProvider"),
    videoUrl: str(fd, "videoUrl"),
    pdfUrl: str(fd, "pdfUrl"),
    durationMinutes: str(fd, "durationMinutes") || "0",
    isFreePreview: bool(fd, "isFreePreview"),
    isPublished: bool(fd, "isPublished"),
    orderIndex: str(fd, "orderIndex") || "0",
  };
}

/** Uploaded PDF (via /api/upload) wins over a pasted URL. */
function resolvePdfUrl(fd: FormData, pasted: string | undefined) {
  const fileId = uuidSchema.safeParse(fd.get("pdfFileId"));
  if (fileId.success) return { url: `/api/files/${fileId.data}`, fileId: fileId.data };
  return { url: pasted || null, fileId: fileIdFromUrl(pasted) };
}

export async function createLessonAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const staff = await requireStaff();
  const parsed = lessonSchema.safeParse(lessonInput(fd));
  if (!parsed.success) return { error: firstError(parsed.error), errors: fieldErrors(parsed.error) };
  const d = parsed.data;
  if (d.type === "video" && (!d.videoProvider || !d.videoUrl)) return { error: "أدخل رابط الفيديو (ارفعه على يوتيوب «غير مدرج» ثم الصق الرابط)" };
  if (d.type === "video" && d.videoProvider === "youtube" && !extractYouTubeId(d.videoUrl ?? "")) return { error: "رابط يوتيوب غير صالح – انسخه من زر «مشاركة» في يوتيوب" };

  const [unit] = await db.select({ id: courseUnits.id }).from(courseUnits).where(and(eq(courseUnits.id, d.unitId), eq(courseUnits.courseId, d.courseId))).limit(1);
  if (!unit) return { error: "الوحدة غير موجودة في هذا الكورس" };
  const pdf = resolvePdfUrl(fd, d.pdfUrl);
  if (d.type === "pdf" && !pdf.url) return { error: "ارفع ملف PDF أو أدخل رابطه" };

  const [created] = await db
    .insert(lessons)
    .values({
      courseId: d.courseId,
      unitId: d.unitId,
      title: d.title,
      description: d.description || null,
      type: d.type,
      videoProvider: d.type === "video" && d.videoProvider ? d.videoProvider : null,
      videoUrl: d.type === "video" ? (d.videoProvider === "youtube" ? `https://youtu.be/${extractYouTubeId(d.videoUrl ?? "")}` : d.videoUrl || null) : null,
      pdfUrl: pdf.url,
      durationMinutes: d.durationMinutes ?? 0,
      isFreePreview: Boolean(d.isFreePreview),
      isPublished: d.isPublished ?? true,
      orderIndex: d.orderIndex ?? 0,
    })
    .returning({ id: lessons.id });
  if (pdf.fileId) await attachUpload(pdf.fileId, "lesson", created.id);

  if (d.type === "quiz") {
    await db.insert(quizzes).values({ courseId: d.courseId, lessonId: created.id, unitId: d.unitId, scope: "lesson", title: d.title, durationMinutes: d.durationMinutes && d.durationMinutes > 0 ? d.durationMinutes : 20 });
  }
  await audit("admin.lesson_created", { userId: staff.id, targetType: "lesson", targetId: created.id });
  revalidateAdmin(`/admin/courses/${d.courseId}`);
  return { ok: true, message: "تمت إضافة الدرس" };
}

export async function updateLessonAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  await requireStaff();
  const id = uuidSchema.safeParse(fd.get("lessonId"));
  if (!id.success) return { error: "درس غير صالح" };
  const parsed = lessonSchema.safeParse(lessonInput(fd));
  if (!parsed.success) return { error: firstError(parsed.error), errors: fieldErrors(parsed.error) };
  const d = parsed.data;
  if (d.type === "video" && (!d.videoProvider || !d.videoUrl)) return { error: "أدخل رابط الفيديو (ارفعه على يوتيوب «غير مدرج» ثم الصق الرابط)" };
  if (d.type === "video" && d.videoProvider === "youtube" && !extractYouTubeId(d.videoUrl ?? "")) return { error: "رابط يوتيوب غير صالح – انسخه من زر «مشاركة» في يوتيوب" };
  const pdf = resolvePdfUrl(fd, d.pdfUrl);
  await db
    .update(lessons)
    .set({
      unitId: d.unitId,
      title: d.title,
      description: d.description || null,
      type: d.type,
      videoProvider: d.type === "video" && d.videoProvider ? d.videoProvider : null,
      videoUrl: d.type === "video" ? (d.videoProvider === "youtube" ? `https://youtu.be/${extractYouTubeId(d.videoUrl ?? "")}` : d.videoUrl || null) : null,
      pdfUrl: pdf.url,
      durationMinutes: d.durationMinutes ?? 0,
      isFreePreview: Boolean(d.isFreePreview),
      isPublished: Boolean(d.isPublished),
      orderIndex: d.orderIndex ?? 0,
    })
    .where(and(eq(lessons.id, id.data), eq(lessons.courseId, d.courseId)));
  if (pdf.fileId) await attachUpload(pdf.fileId, "lesson", id.data);

  if (d.type === "quiz") {
    const [q] = await db.select({ id: quizzes.id }).from(quizzes).where(eq(quizzes.lessonId, id.data)).limit(1);
    if (!q) await db.insert(quizzes).values({ courseId: d.courseId, lessonId: id.data, unitId: d.unitId, scope: "lesson", title: d.title });
  }
  revalidateAdmin(`/admin/courses/${d.courseId}`);
  return { ok: true, message: "تم حفظ الدرس" };
}

export async function deleteLessonAction(fd: FormData) {
  await requireStaff();
  const id = uuidSchema.safeParse(fd.get("lessonId"));
  const courseId = uuidSchema.safeParse(fd.get("courseId"));
  if (!id.success || !courseId.success) return;
  await db.delete(lessons).where(and(eq(lessons.id, id.data), eq(lessons.courseId, courseId.data)));
  revalidateAdmin(`/admin/courses/${courseId.data}`);
}

/* ───────────────────────── Quizzes (scheduling + anti-cheat) & questions ───────────────────────── */

function quizInput(fd: FormData) {
  return {
    title: fd.get("title"),
    description: str(fd, "description"),
    durationMinutes: str(fd, "durationMinutes"),
    passPercent: str(fd, "passPercent"),
    maxAttempts: str(fd, "maxAttempts"),
    shuffleQuestions: bool(fd, "shuffleQuestions"),
    showAnswers: bool(fd, "showAnswers"),
    isPublished: bool(fd, "isPublished"),
    availableFrom: str(fd, "availableFrom"),
    availableUntil: str(fd, "availableUntil"),
    requireFullscreen: bool(fd, "requireFullscreen"),
    antiCheat: bool(fd, "antiCheat"),
    maxViolations: str(fd, "maxViolations") || "3",
    scope: str(fd, "scope") || "course",
    unitId: str(fd, "unitId"),
    lessonId: str(fd, "lessonId"),
    requireLessonComplete: bool(fd, "requireLessonComplete"),
    unlockLessonId: str(fd, "unlockLessonId"),
  };
}

/** Validates that unit/lesson/unlock-lesson belong to the course and returns normalized linkage. */
async function resolveQuizLinkage(courseId: string, d: { scope?: "course" | "unit" | "lesson"; unitId?: string; lessonId?: string; unlockLessonId?: string }) {
  const scope = d.scope ?? "course";
  let unitId: string | null = null;
  let lessonId: string | null = null;
  if (scope === "unit") {
    const [u] = await db.select({ id: courseUnits.id }).from(courseUnits).where(and(eq(courseUnits.id, d.unitId || "00000000-0000-0000-0000-000000000000"), eq(courseUnits.courseId, courseId))).limit(1);
    if (!u) return { error: "الوحدة لا تنتمي لهذا الكورس" } as const;
    unitId = u.id;
  }
  if (scope === "lesson") {
    const [l] = await db.select({ id: lessons.id, unitId: lessons.unitId }).from(lessons).where(and(eq(lessons.id, d.lessonId || "00000000-0000-0000-0000-000000000000"), eq(lessons.courseId, courseId))).limit(1);
    if (!l) return { error: "الدرس لا ينتمي لهذا الكورس" } as const;
    lessonId = l.id;
    unitId = l.unitId;
  }
  let unlockLessonId: string | null = null;
  if (d.unlockLessonId) {
    const [l] = await db.select({ id: lessons.id }).from(lessons).where(and(eq(lessons.id, d.unlockLessonId), eq(lessons.courseId, courseId))).limit(1);
    if (!l) return { error: "درس الفتح بعد النجاح لا ينتمي لهذا الكورس" } as const;
    unlockLessonId = l.id;
  }
  return { scope, unitId, lessonId, unlockLessonId } as const;
}

function quizValues(d: ReturnType<typeof quizSchema.parse>) {
  const from = parseLocalDateTime(d.availableFrom);
  const until = parseLocalDateTime(d.availableUntil);
  return {
    title: d.title,
    description: d.description || null,
    durationMinutes: d.durationMinutes,
    passPercent: d.passPercent,
    maxAttempts: d.maxAttempts,
    shuffleQuestions: Boolean(d.shuffleQuestions),
    showAnswers: Boolean(d.showAnswers),
    isPublished: Boolean(d.isPublished),
    availableFrom: from,
    availableUntil: until,
    requireFullscreen: Boolean(d.requireFullscreen),
    antiCheat: Boolean(d.antiCheat),
    maxViolations: d.maxViolations ?? 3,
  };
}

export async function updateQuizAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const staff = await requireStaff();
  const id = uuidSchema.safeParse(fd.get("quizId"));
  if (!id.success) return { error: "امتحان غير صالح" };
  const parsed = quizSchema.safeParse(quizInput(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const v = quizValues(parsed.data);
  if (v.availableFrom && v.availableUntil && v.availableUntil <= v.availableFrom) return { error: "وقت الإغلاق يجب أن يكون بعد وقت الفتح" };
  const [existing] = await db.select({ courseId: quizzes.courseId }).from(quizzes).where(eq(quizzes.id, id.data)).limit(1);
  if (!existing) return { error: "الامتحان غير موجود" };
  const link = await resolveQuizLinkage(existing.courseId, parsed.data);
  if ("error" in link) return { error: link.error };
  const [quiz] = await db
    .update(quizzes)
    .set({ ...v, scope: link.scope, unitId: link.unitId, lessonId: link.lessonId, unlockLessonId: link.unlockLessonId, requireLessonComplete: Boolean(parsed.data.requireLessonComplete) })
    .where(eq(quizzes.id, id.data))
    .returning({ courseId: quizzes.courseId });
  await audit("admin.quiz_updated", { userId: staff.id, targetType: "quiz", targetId: id.data });
  if (quiz) revalidateAdmin(`/admin/courses/${quiz.courseId}`, `/admin/courses/${quiz.courseId}/quiz/${id.data}`, "/admin/exams", `/quiz/${id.data}`);
  return { ok: true, message: "تم حفظ إعدادات الامتحان" };
}

export async function createStandaloneQuizAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const staff = await requireStaff();
  const parsed = standaloneQuizSchema.safeParse({ ...quizInput(fd), courseId: fd.get("courseId") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const v = quizValues(parsed.data);
  if (v.availableFrom && v.availableUntil && v.availableUntil <= v.availableFrom) return { error: "وقت الإغلاق يجب أن يكون بعد وقت الفتح" };
  const link = await resolveQuizLinkage(parsed.data.courseId, parsed.data);
  if ("error" in link) return { error: link.error };
  const [created] = await db
    .insert(quizzes)
    .values({ ...v, courseId: parsed.data.courseId, scope: link.scope, unitId: link.unitId, lessonId: link.lessonId, unlockLessonId: link.unlockLessonId, requireLessonComplete: Boolean(parsed.data.requireLessonComplete) })
    .returning({ id: quizzes.id });
  await audit("admin.quiz_created", { userId: staff.id, targetType: "quiz", targetId: created.id, meta: { scope: link.scope } });

  // Tell enrolled students about the new exam
  const enrolled = await db.select({ userId: enrollments.userId }).from(enrollments).where(eq(enrollments.courseId, parsed.data.courseId));
  if (enrolled.length && v.isPublished) {
    await db.insert(notifications).values(
      enrolled.map((e) => ({
        userId: e.userId,
        type: "exam" as const,
        title: `امتحان جديد: ${v.title}`,
        body: v.availableFrom ? "تمت جدولة امتحان جديد – راجع موعده من صفحة الامتحانات." : "تمت إضافة امتحان جديد متاح الآن.",
        href: `/quiz/${created.id}`,
      })),
    );
  }
  revalidateAdmin(`/admin/courses/${parsed.data.courseId}`, "/admin/exams");
  redirect(`/admin/courses/${parsed.data.courseId}/quiz/${created.id}`);
}

export async function deleteQuizAction(fd: FormData) {
  const staff = await requireStaff();
  const id = uuidSchema.safeParse(fd.get("quizId"));
  const courseId = uuidSchema.safeParse(fd.get("courseId"));
  if (!id.success || !courseId.success) return;
  await db.delete(quizzes).where(and(eq(quizzes.id, id.data), eq(quizzes.courseId, courseId.data)));
  await audit("admin.quiz_deleted", { userId: staff.id, targetType: "quiz", targetId: id.data });
  revalidateAdmin(`/admin/courses/${courseId.data}`, "/admin/exams");
  redirect(`/admin/courses/${courseId.data}`);
}

function questionInput(fd: FormData) {
  const options: string[] = [];
  for (let i = 0; i < 6; i++) {
    const v = str(fd, `option_${i}`).trim();
    if (v) options.push(v);
  }
  return {
    quizId: fd.get("quizId"),
    text: fd.get("text"),
    imageUrl: str(fd, "imageUrl"),
    options,
    correctIndex: str(fd, "correctIndex") || "0",
    explanation: str(fd, "explanation"),
    points: str(fd, "points") || "1",
  };
}

export async function createQuestionAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  await requireStaff();
  const parsed = questionSchema.safeParse(questionInput(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${questions.orderIndex}), -1)` }).from(questions).where(eq(questions.quizId, d.quizId));
  await db.insert(questions).values({ quizId: d.quizId, text: d.text, imageUrl: d.imageUrl || null, options: d.options, correctIndex: d.correctIndex, explanation: d.explanation || null, points: d.points ?? 1, orderIndex: Number(max) + 1 });
  const [quiz] = await db.select({ courseId: quizzes.courseId }).from(quizzes).where(eq(quizzes.id, d.quizId)).limit(1);
  if (quiz) revalidateAdmin(`/admin/courses/${quiz.courseId}/quiz/${d.quizId}`);
  return { ok: true, message: "تمت إضافة السؤال" };
}

export async function updateQuestionAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  await requireStaff();
  const id = uuidSchema.safeParse(fd.get("questionId"));
  if (!id.success) return { error: "سؤال غير صالح" };
  const parsed = questionSchema.safeParse(questionInput(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;
  await db
    .update(questions)
    .set({ text: d.text, imageUrl: d.imageUrl || null, options: d.options, correctIndex: d.correctIndex, explanation: d.explanation || null, points: d.points ?? 1 })
    .where(and(eq(questions.id, id.data), eq(questions.quizId, d.quizId)));
  const [quiz] = await db.select({ courseId: quizzes.courseId }).from(quizzes).where(eq(quizzes.id, d.quizId)).limit(1);
  if (quiz) revalidateAdmin(`/admin/courses/${quiz.courseId}/quiz/${d.quizId}`);
  return { ok: true, message: "تم حفظ السؤال" };
}

/**
 * Bulk import. Accepted format (one block per question, blank line between blocks):
 *   1. نص السؤال
 *   أ) اختيار   /  أ- اختيار / A) option / - option
 *   ب) اختيار *   ← النجمة تحدد الإجابة الصحيحة (أو سطر "الإجابة: ب")
 *   شرح: نص اختياري
 */
export async function importQuestionsAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const staff = await requireStaff();
  const parsed = bulkQuestionsSchema.safeParse({ quizId: fd.get("quizId"), text: fd.get("text"), points: str(fd, "points") || "1" });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { quizId, text } = parsed.data;
  const [quiz] = await db.select({ courseId: quizzes.courseId }).from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
  if (!quiz) return { error: "الامتحان غير موجود" };

  const LETTERS = ["أ", "ب", "ج", "د", "هـ", "و", "a", "b", "c", "d", "e", "f", "A", "B", "C", "D", "E", "F", "1", "2", "3", "4", "5", "6"];
  const letterIndex = (l: string) => {
    const i = LETTERS.indexOf(l);
    return i < 0 ? -1 : i % 6;
  };
  const optionRe = /^\s*(?:[-•*]\s*)?([أابجدهوabcdefABCDEF1-6]|هـ)\s*[)\-.:ـ]\s*(.+?)\s*$/u;
  const answerRe = /^\s*(?:الإجابة|الاجابة|الصحيحة|answer|ans)\s*[:：]\s*([أابجدهوabcdefABCDEF1-6]|هـ)\s*$/iu;
  const explainRe = /^\s*(?:شرح|التفسير|explanation)\s*[:：]\s*(.+)$/iu;

  const blocks = text.replace(/\r/g, "").split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);
  const rows: Array<{ text: string; options: string[]; correctIndex: number; explanation: string | null }> = [];
  const errors: string[] = [];
  for (const [bi, block] of blocks.entries()) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const qLines: string[] = [];
    const options: string[] = [];
    let correct = -1;
    let explanation: string | null = null;
    for (const line of lines) {
      const ex = line.match(explainRe);
      if (ex) {
        explanation = ex[1].trim();
        continue;
      }
      const an = line.match(answerRe);
      if (an) {
        correct = letterIndex(an[1] === "ا" ? "أ" : an[1]);
        continue;
      }
      const op = line.match(optionRe);
      if (op && (options.length > 0 || qLines.length > 0)) {
        let opt = op[2].trim();
        if (/[*✓✔]\s*$/.test(opt) || /^[*✓✔]/.test(opt)) {
          correct = options.length;
          opt = opt.replace(/^[*✓✔]\s*|\s*[*✓✔]$/g, "").trim();
        }
        options.push(opt.slice(0, 300));
        continue;
      }
      if (options.length === 0) qLines.push(line.replace(/^\s*(?:س\s*)?\d+\s*[).\-:ـ]\s*/u, ""));
    }
    const qText = qLines.join(" ").trim();
    if (!qText || options.length < 2) {
      errors.push(`الكتلة ${bi + 1}: سؤال بدون نص أو أقل من اختيارين`);
      continue;
    }
    if (correct < 0 || correct >= options.length) {
      errors.push(`الكتلة ${bi + 1}: لم تُحدد الإجابة الصحيحة (ضع * بعد الاختيار الصحيح أو سطر "الإجابة: ب")`);
      continue;
    }
    rows.push({ text: qText.slice(0, 2000), options: options.slice(0, 6), correctIndex: correct, explanation });
  }
  if (!rows.length) return { error: errors[0] ?? "لم يتم التعرف على أي سؤال – راجع التنسيق" };

  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${questions.orderIndex}), -1)` }).from(questions).where(eq(questions.quizId, quizId));
  await db.insert(questions).values(rows.map((r, i) => ({ quizId, text: r.text, options: r.options, correctIndex: r.correctIndex, explanation: r.explanation, points: parsed.data.points ?? 1, orderIndex: Number(max) + 1 + i })));
  await audit("admin.questions_imported", { userId: staff.id, targetType: "quiz", targetId: quizId, meta: { count: rows.length, skipped: errors.length } });
  revalidateAdmin(`/admin/courses/${quiz.courseId}/quiz/${quizId}`);
  return { ok: true, message: `تم استيراد ${rows.length} سؤال${errors.length ? ` – وتم تخطي ${errors.length}: ${errors.slice(0, 3).join(" | ")}` : ""}` };
}

export async function deleteQuestionAction(fd: FormData) {
  await requireStaff();
  const id = uuidSchema.safeParse(fd.get("questionId"));
  const quizId = uuidSchema.safeParse(fd.get("quizId"));
  if (!id.success || !quizId.success) return;
  await db.delete(questions).where(and(eq(questions.id, id.data), eq(questions.quizId, quizId.data)));
  const [quiz] = await db.select({ courseId: quizzes.courseId }).from(quizzes).where(eq(quizzes.id, quizId.data)).limit(1);
  if (quiz) revalidateAdmin(`/admin/courses/${quiz.courseId}/quiz/${quizId.data}`);
}

/* ───────────────────────── Center codes ───────────────────────── */

export async function generateCodesAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const parsed = generateCodesSchema.safeParse({
    scope: fd.get("scope"),
    courseId: str(fd, "courseId"),
    unitId: str(fd, "unitId"),
    lessonId: str(fd, "lessonId"),
    quantity: str(fd, "quantity") || "1",
    batch: str(fd, "batch"),
    expiresInDays: str(fd, "expiresInDays") || "0",
    accessDays: str(fd, "accessDays") || "0",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;

  // Validate the hierarchy server-side (unit/lesson must belong to the course)
  const [course] = await db.select({ id: courses.id, title: courses.title }).from(courses).where(eq(courses.id, d.courseId)).limit(1);
  if (!course) return { error: "الكورس غير موجود" };
  if (d.scope === "unit") {
    const [u] = await db.select({ id: courseUnits.id }).from(courseUnits).where(and(eq(courseUnits.id, d.unitId!), eq(courseUnits.courseId, d.courseId))).limit(1);
    if (!u) return { error: "الوحدة لا تنتمي لهذا الكورس" };
  }
  if (d.scope === "lesson") {
    const [l] = await db.select({ id: lessons.id }).from(lessons).where(and(eq(lessons.id, d.lessonId!), eq(lessons.courseId, d.courseId))).limit(1);
    if (!l) return { error: "الدرس لا ينتمي لهذا الكورس" };
  }

  const batch = d.batch || `سنتر-${new Date().toISOString().slice(0, 10)}`;
  const expiresAt = d.expiresInDays ? new Date(Date.now() + d.expiresInDays * 86_400_000) : null;
  const prefix = d.scope === "course" ? "CR" : d.scope === "unit" ? "UN" : "LS";
  const codes: string[] = [];
  const rows = Array.from({ length: d.quantity }, () => {
    const code = generateActivationCode(prefix);
    codes.push(code);
    return {
      code,
      type: "course" as const,
      scope: d.scope,
      amount: d.accessDays ?? 0, // access duration in days (0 = course default / unlimited)
      courseId: d.courseId,
      unitId: d.scope === "unit" ? d.unitId || null : null,
      lessonId: d.scope === "lesson" ? d.lessonId || null : null,
      batch,
      createdBy: admin.id,
      expiresAt,
    };
  });
  await db.insert(activationCodes).values(rows);
  await audit("admin.codes_generated", { userId: admin.id, meta: { quantity: d.quantity, scope: d.scope, batch, courseId: d.courseId } });
  revalidatePath("/admin/codes");
  return { ok: true, message: `تم توليد ${d.quantity} كود لـ «${course.title}»`, codes };
}

export async function deleteCodeAction(fd: FormData) {
  await requireAdmin();
  const id = uuidSchema.safeParse(fd.get("codeId"));
  if (!id.success) return;
  await db.delete(activationCodes).where(and(eq(activationCodes.id, id.data), eq(activationCodes.isUsed, false)));
  revalidatePath("/admin/codes");
}

/* ───────────────────────── Payments (review + AI) ───────────────────────── */

export async function reviewPaymentAction(fd: FormData) {
  const staff = await requireStaff();
  const id = uuidSchema.safeParse(fd.get("paymentId"));
  const decision = fd.get("decision");
  const note = str(fd, "note").slice(0, 300);
  if (!id.success || (decision !== "approve" && decision !== "reject")) return;
  const ok = decision === "approve" ? await approvePaymentRequest(id.data, staff.id, note || null) : await rejectPaymentRequest(id.data, staff.id, note || null);
  if (ok) await audit(`admin.payment_${decision}`, { userId: staff.id, targetType: "payment", targetId: id.data });
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  revalidatePath("/dashboard", "layout");
}

export async function analyzePaymentAction(fd: FormData) {
  const staff = await requireStaff();
  const id = uuidSchema.safeParse(fd.get("paymentId"));
  if (!id.success) return;
  try {
    const v = await runAiOnPayment(id.data);
    await audit("admin.payment_ai_check", { userId: staff.id, targetType: "payment", targetId: id.data, meta: { score: v?.score ?? null } });
  } catch {
    /* verdict with error is stored by runAiOnPayment when possible */
  }
  revalidatePath("/admin/payments");
}

/* ───────────────────────── AI settings ───────────────────────── */

export async function updateAiSettingsAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const parsed = aiSettingsSchema.safeParse({
    ai_provider: fd.get("ai_provider"),
    ai_model: str(fd, "ai_model"),
    ai_api_key: str(fd, "ai_api_key"),
    ai_auto_approve: bool(fd, "ai_auto_approve"),
    ai_min_confidence: str(fd, "ai_min_confidence") || "85",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;
  const now = new Date();
  const upsert = async (key: SettingsKey, value: string) =>
    db.insert(settings).values({ key, value, updatedAt: now }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } });
  await upsert("ai_provider", d.ai_provider);
  await upsert("ai_model", d.ai_model || "");
  await upsert("ai_auto_approve", d.ai_auto_approve ? "true" : "false");
  await upsert("ai_min_confidence", String(d.ai_min_confidence));
  // Blank key = keep the existing secret; "clear" = remove it
  if (d.ai_api_key === "clear") await upsert("ai_api_key", "");
  else if (d.ai_api_key) await upsert("ai_api_key", d.ai_api_key);
  await audit("admin.ai_settings_updated", { userId: admin.id, meta: { provider: d.ai_provider, auto: d.ai_auto_approve } });
  revalidatePath("/admin/ai");
  return { ok: true, message: "تم حفظ إعدادات الذكاء الاصطناعي" };
}

export async function updateBunnySettingsAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const libraryId = str(fd, "bunny_library_id").trim().slice(0, 20);
  const apiKey = str(fd, "bunny_api_key").trim().slice(0, 200);
  const host = str(fd, "bunny_cdn_hostname").trim().replace(/^https?:\/\//, "").replace(/\/$/, "").slice(0, 120);
  if (libraryId && !/^\d+$/.test(libraryId)) return { error: "Library ID يجب أن يكون رقمًا" };
  if (host && !/^[a-z0-9.-]+$/i.test(host)) return { error: "اسم مضيف CDN غير صالح (مثال: vz-xxxx.b-cdn.net)" };
  const now = new Date();
  const upsert = async (key: SettingsKey, value: string) =>
    db.insert(settings).values({ key, value, updatedAt: now }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } });
  await upsert("bunny_library_id", libraryId);
  await upsert("bunny_cdn_hostname", host);
  if (apiKey === "clear") await upsert("bunny_api_key", "");
  else if (apiKey) await upsert("bunny_api_key", apiKey);
  await audit("admin.bunny_settings_updated", { userId: admin.id, meta: { libraryId: Boolean(libraryId) } });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/media");
  return { ok: true, message: "تم حفظ إعدادات Bunny Stream" };
}

export async function testBunnyAction(_prev: AdminState, _fd: FormData): Promise<AdminState> {
  await requireAdmin();
  const s = await getSettings();
  if (!s.bunny_library_id || !s.bunny_api_key) return { error: "أدخل Library ID ومفتاح API أولًا" };
  try {
    const res = await fetch(`https://video.bunnycdn.com/library/${encodeURIComponent(s.bunny_library_id)}/videos?page=1&itemsPerPage=1`, { headers: { AccessKey: s.bunny_api_key, Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return { error: `فشل الاتصال (HTTP ${res.status}) – تأكد من Library ID ومفتاح Stream API الخاص بالمكتبة نفسها` };
    const data = (await res.json()) as { totalItems?: number };
    return { ok: true, message: `الاتصال ناجح – المكتبة تحتوي على ${data.totalItems ?? 0} فيديو` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "فشل الاتصال" };
  }
}

export async function testAiAction(_prev: AdminState, _fd: FormData): Promise<AdminState> {
  await requireAdmin();
  const s = await getSettings();
  if (s.ai_provider !== "gemini" && s.ai_provider !== "openai") return { error: "اختر مزود الذكاء الاصطناعي أولًا" };
  if (!s.ai_api_key) return { error: "أدخل مفتاح API أولًا" };
  const res = await pingAi(s.ai_provider, s.ai_api_key, s.ai_model || DEFAULT_MODELS[s.ai_provider]);
  return res.ok ? { ok: true, message: res.message } : { error: res.message };
}

/* ───────────────────────── Students ───────────────────────── */

export async function toggleBanAction(fd: FormData) {
  const staff = await requireStaff();
  const id = uuidSchema.safeParse(fd.get("userId"));
  if (!id.success || id.data === staff.id) return;
  const [u] = await db.select({ isBanned: users.isBanned, role: users.role }).from(users).where(eq(users.id, id.data)).limit(1);
  if (!u || (u.role === "admin" && staff.role !== "admin")) return;
  await db
    .update(users)
    .set({ isBanned: !u.isBanned, banReason: !u.isBanned ? str(fd, "reason").slice(0, 200) || null : null, updatedAt: new Date() })
    .where(eq(users.id, id.data));
  if (!u.isBanned) await db.delete(sessions).where(eq(sessions.userId, id.data));
  await audit(u.isBanned ? "admin.user_unbanned" : "admin.user_banned", { userId: staff.id, targetType: "user", targetId: id.data });
  revalidatePath(`/admin/students/${id.data}`);
  revalidatePath("/admin/students");
}

export async function toggleActiveAction(fd: FormData) {
  const staff = await requireStaff();
  const id = uuidSchema.safeParse(fd.get("userId"));
  if (!id.success || id.data === staff.id) return;
  const [u] = await db.select({ isActive: users.isActive }).from(users).where(eq(users.id, id.data)).limit(1);
  if (!u) return;
  await db.update(users).set({ isActive: !u.isActive, updatedAt: new Date() }).where(eq(users.id, id.data));
  if (u.isActive) await db.delete(sessions).where(eq(sessions.userId, id.data));
  revalidatePath(`/admin/students/${id.data}`);
  revalidatePath("/admin/students");
}

export async function adminResetPasswordAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const parsed = adminResetPasswordSchema.safeParse({ userId: fd.get("userId"), newPassword: fd.get("newPassword") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const hash = await hashPassword(parsed.data.newPassword);
  await db.update(users).set({ passwordHash: hash, mustChangePassword: true, failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() }).where(eq(users.id, parsed.data.userId));
  await db.delete(sessions).where(eq(sessions.userId, parsed.data.userId));
  await audit("admin.password_reset", { userId: admin.id, targetType: "user", targetId: parsed.data.userId });
  return { ok: true, message: "تم تغيير كلمة المرور وتسجيل خروج الطالب من كل الأجهزة" };
}

export async function setRoleAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = uuidSchema.safeParse(fd.get("userId"));
  const role = fd.get("role");
  if (!id.success || id.data === admin.id) return;
  if (role !== "student" && role !== "assistant" && role !== "admin") return;
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id.data));
  await audit("admin.role_changed", { userId: admin.id, targetType: "user", targetId: id.data, meta: { role } });
  revalidatePath(`/admin/students/${id.data}`);
}

export async function unlockAccountAction(fd: FormData) {
  await requireStaff();
  const id = uuidSchema.safeParse(fd.get("userId"));
  if (!id.success) return;
  await db.update(users).set({ failedLoginAttempts: 0, lockedUntil: null }).where(eq(users.id, id.data));
  revalidatePath(`/admin/students/${id.data}`);
}

export async function enrollStudentAction(fd: FormData) {
  const staff = await requireStaff();
  const parsed = enrollStudentSchema.safeParse({ userId: fd.get("userId"), courseId: fd.get("courseId") });
  if (!parsed.success) return;
  const [course] = await db.select({ accessDays: courses.accessDays, title: courses.title, slug: courses.slug }).from(courses).where(eq(courses.id, parsed.data.courseId)).limit(1);
  if (!course) return;
  const expiresAt = course.accessDays ? new Date(Date.now() + course.accessDays * 86_400_000) : null;
  await db
    .insert(enrollments)
    .values({ userId: parsed.data.userId, courseId: parsed.data.courseId, source: "admin", expiresAt })
    .onConflictDoUpdate({ target: [enrollments.userId, enrollments.courseId], set: { expiresAt, source: "admin" } });
  await notify(parsed.data.userId, { title: "تم تفعيل كورس لك", body: `قامت الإدارة بتفعيل كورس «${course.title}» على حسابك.`, type: "course", href: `/learn/${course.slug}` });
  await audit("admin.enrolled_student", { userId: staff.id, targetType: "user", targetId: parsed.data.userId, meta: { courseId: parsed.data.courseId } });
  revalidatePath(`/admin/students/${parsed.data.userId}`);
}

export async function unenrollStudentAction(fd: FormData) {
  const staff = await requireStaff();
  const parsed = enrollStudentSchema.safeParse({ userId: fd.get("userId"), courseId: fd.get("courseId") });
  if (!parsed.success) return;
  await db.delete(enrollments).where(and(eq(enrollments.userId, parsed.data.userId), eq(enrollments.courseId, parsed.data.courseId)));
  await db.delete(lessonAccess).where(and(eq(lessonAccess.userId, parsed.data.userId), eq(lessonAccess.courseId, parsed.data.courseId)));
  await audit("admin.unenrolled_student", { userId: staff.id, targetType: "user", targetId: parsed.data.userId });
  revalidatePath(`/admin/students/${parsed.data.userId}`);
}

export async function logoutUserEverywhereAction(fd: FormData) {
  await requireStaff();
  const id = uuidSchema.safeParse(fd.get("userId"));
  if (!id.success) return;
  await db.delete(sessions).where(eq(sessions.userId, id.data));
  revalidatePath(`/admin/students/${id.data}`);
}

export async function deleteStudentAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = uuidSchema.safeParse(fd.get("userId"));
  if (!id.success || id.data === admin.id) return;
  await db.delete(users).where(and(eq(users.id, id.data), ne(users.role, "admin")));
  await audit("admin.user_deleted", { userId: admin.id, targetType: "user", targetId: id.data });
  revalidatePath("/admin/students");
  redirect("/admin/students");
}

/* ───────────────────────── Announcements ───────────────────────── */

export async function createAnnouncementAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  await requireStaff();
  const parsed = announcementSchema.safeParse({ title: fd.get("title"), body: fd.get("body"), grade: str(fd, "grade") || "all", isPinned: bool(fd, "isPinned"), isPublished: true });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;
  const [ann] = await db.insert(announcements).values({ title: d.title, body: d.body, grade: d.grade === "all" ? null : d.grade, isPinned: Boolean(d.isPinned), isPublished: true }).returning({ id: announcements.id });
  // Fan-out: every targeted student gets a bell notification (unread count = how many announcements they haven't seen)
  const targets = await db
    .select({ id: users.id })
    .from(users)
    .where(d.grade === "all" ? eq(users.role, "student") : and(eq(users.role, "student"), eq(users.grade, d.grade)));
  if (targets.length) {
    const chunk = 500;
    for (let i = 0; i < targets.length; i += chunk) {
      await db.insert(notifications).values(targets.slice(i, i + chunk).map((t) => ({ userId: t.id, type: "info" as const, title: `📢 ${d.title}`, body: d.body.slice(0, 600), href: `/dashboard/notifications#a-${ann.id}` })));
    }
  }
  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: `تم نشر الإعلان وإرساله كإشعار لـ ${targets.length} طالب` };
}

export async function deleteAnnouncementAction(fd: FormData) {
  await requireStaff();
  const id = uuidSchema.safeParse(fd.get("announcementId"));
  if (!id.success) return;
  await db.delete(announcements).where(eq(announcements.id, id.data));
  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/announcements");
}

export async function toggleAnnouncementAction(fd: FormData) {
  await requireStaff();
  const id = uuidSchema.safeParse(fd.get("announcementId"));
  if (!id.success) return;
  await db.update(announcements).set({ isPublished: sql`not ${announcements.isPublished}` }).where(eq(announcements.id, id.data));
  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard", "layout");
}

/* ───────────────────────── Settings ───────────────────────── */

const AI_KEYS = new Set<string>(["ai_provider", "ai_model", "ai_api_key", "ai_auto_approve", "ai_min_confidence", "bunny_library_id", "bunny_api_key", "bunny_cdn_hostname", "img_hero", "img_about", "img_feature_1", "img_feature_2", "img_feature_3", "img_auth", "auth_quote", "auth_quote_author"]);

export async function updateSettingsAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const keys = (Object.keys(DEFAULT_SETTINGS) as SettingsKey[]).filter((k) => !AI_KEYS.has(k));
  const now = new Date();
  for (const key of keys) {
    const raw = fd.get(key);
    if (raw === null) continue;
    let value = String(raw).trim().slice(0, 2000);
    if (key === "max_devices") {
      const n = Number(value);
      value = String(Number.isInteger(n) && n >= 1 && n <= 10 ? n : 2);
    }
    if (key === "allow_registration" || key === "pricing_enabled") value = value === "true" || value === "on" ? "true" : "false";
    if (key === "plan_popular" && !["basic", "premium", "vip", "none"].includes(value)) value = "premium";
    if (["facebook", "instagram", "youtube", "telegram", "tiktok", "developer_url"].includes(key) && value && !/^https?:\/\//i.test(value)) {
      return { error: `رابط ${key} غير صالح – يجب أن يبدأ بـ https://` };
    }
    await db.insert(settings).values({ key, value, updatedAt: now }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } });
  }
  await audit("admin.settings_updated", { userId: admin.id });
  revalidatePath("/", "layout");
  return { ok: true, message: "تم حفظ الإعدادات" };
}

/* ───────────────────────── Site images (hero / about / features / auth) ───────────────────────── */

const IMAGE_KEYS = ["img_hero", "img_about", "img_feature_1", "img_feature_2", "img_feature_3", "img_auth"] as const;

export async function updateSiteImagesAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const now = new Date();
  let changed = 0;
  for (const key of IMAGE_KEYS) {
    const fileId = uuidSchema.safeParse(fd.get(`${key}_file`));
    const reset = fd.get(`${key}_reset`) === "on";
    let value: string | null = null;
    if (fileId.success) {
      await attachUpload(fileId.data, "site_image", admin.id);
      value = `/api/files/${fileId.data}`;
    } else if (reset) {
      value = DEFAULT_SETTINGS[key];
    }
    if (value !== null) {
      await db.insert(settings).values({ key, value, updatedAt: now }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } });
      changed++;
    }
  }
  const quote = str(fd, "auth_quote").trim().slice(0, 300);
  const author = str(fd, "auth_quote_author").trim().slice(0, 80);
  for (const [key, value] of [["auth_quote", quote], ["auth_quote_author", author]] as const) {
    if (fd.has(key)) await db.insert(settings).values({ key, value, updatedAt: now }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } });
  }
  await audit("admin.site_images_updated", { userId: admin.id, meta: { changed } });
  revalidatePath("/", "layout");
  return { ok: true, message: changed ? `تم تحديث ${changed} صورة وحفظ الرسالة` : "تم حفظ الرسالة التحفيزية" };
}

/* ───────────────────────── Testimonials ───────────────────────── */

export async function createTestimonialAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  await requireStaff();
  const parsed = testimonialSchema.safeParse({ name: fd.get("name"), role: str(fd, "role"), grade: str(fd, "grade") || "none", text: fd.get("text"), stars: str(fd, "stars") || "5", avatarUrl: str(fd, "avatarUrl"), orderIndex: str(fd, "orderIndex") || "0" });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;
  await db.insert(testimonials).values({ name: d.name, role: d.role || null, grade: d.grade === "none" ? null : d.grade, text: d.text, stars: d.stars, avatarUrl: d.avatarUrl || null, orderIndex: d.orderIndex ?? 0, isPublished: true });
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  return { ok: true, message: "تمت إضافة الرأي" };
}

export async function toggleTestimonialAction(fd: FormData) {
  await requireStaff();
  const id = uuidSchema.safeParse(fd.get("testimonialId"));
  if (!id.success) return;
  await db.update(testimonials).set({ isPublished: sql`not ${testimonials.isPublished}` }).where(eq(testimonials.id, id.data));
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}

export async function deleteTestimonialAction(fd: FormData) {
  await requireStaff();
  const id = uuidSchema.safeParse(fd.get("testimonialId"));
  if (!id.success) return;
  await db.delete(testimonials).where(eq(testimonials.id, id.data));
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}

/* ───────────────────────── Curriculum drag & drop reorder ───────────────────────── */

/**
 * Saves the new hierarchical order after Drag & Drop:
 * course ← units (chapters) ← lessons. Everything is validated
 * server-side so no lesson/unit from another course can sneak in.
 */
export async function reorderCurriculumAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const staff = await requireStaff();
  const courseId = uuidSchema.safeParse(fd.get("courseId"));
  if (!courseId.success) return { error: "الكورس غير صالح" };

  let unitOrder: string[];
  let lessonOrder: Record<string, string[]>;
  try {
    unitOrder = JSON.parse(str(fd, "units") || "[]") as string[];
    lessonOrder = JSON.parse(str(fd, "lessons") || "{}") as Record<string, string[]>;
  } catch {
    return { error: "بيانات الترتيب غير صالحة" };
  }
  if (!Array.isArray(unitOrder) || !unitOrder.every((x) => typeof x === "string") || !unitOrder.length) {
    return { error: "قائمة الوحدات فارغة أو غير صالحة" };
  }

  const [course] = await db.select({ id: courses.id }).from(courses).where(eq(courses.id, courseId.data)).limit(1);
  if (!course) return { error: "الكورس غير موجود" };

  const dbUnits = await db.select({ id: courseUnits.id }).from(courseUnits).where(eq(courseUnits.courseId, courseId.data));
  const validUnits = new Set(dbUnits.map((u) => u.id));
  if (unitOrder.length !== dbUnits.length || !unitOrder.every((id) => validUnits.has(id))) {
    return { error: "بعض الوحدات غير تابعة لهذا الكورس – أعد تحميل الصفحة" };
  }

  const dbLessons = await db.select({ id: lessons.id, unitId: lessons.unitId }).from(lessons).where(eq(lessons.courseId, courseId.data));
  const lessonUnit = new Map(dbLessons.map((l) => [l.id, l.unitId]));
  const seen: string[] = [];
  for (const [unitId, ids] of Object.entries(lessonOrder)) {
    if (!validUnits.has(unitId)) return { error: "وحدة غير صالحة في الترتيب" };
    if (!Array.isArray(ids)) return { error: "ترتيب الدروس غير صالح" };
    for (const lid of ids) {
      if (typeof lid !== "string" || !lessonUnit.has(lid) || lessonUnit.get(lid) !== unitId) {
        return { error: "بعض الدروس لا تنتمي للمكان المحدد – أعد تحميل الصفحة" };
      }
      seen.push(lid);
    }
  }
  if (seen.length !== dbLessons.length || new Set(seen).size !== dbLessons.length) {
    return { error: "عدد الدروس غير مكتمل – أعد تحميل الصفحة" };
  }

  await db.transaction(async (tx) => {
    for (let i = 0; i < unitOrder.length; i++) {
      await tx.update(courseUnits).set({ orderIndex: i }).where(eq(courseUnits.id, unitOrder[i]));
    }
    for (const [unitId, ids] of Object.entries(lessonOrder)) {
      for (let i = 0; i < ids.length; i++) {
        await tx.update(lessons).set({ orderIndex: i, unitId }).where(eq(lessons.id, ids[i]));
      }
    }
  });

  await audit("admin.curriculum_reordered", { userId: staff.id, targetType: "course", targetId: courseId.data, meta: { units: unitOrder.length, lessons: seen.length } });
  revalidateAdmin(`/admin/courses/${courseId.data}`, `/courses`);
  return { ok: true, message: "تم حفظ ترتيب المنهج (الفصول والدروس)" };
}

/* ───────────────────────── AI quiz import (JSON) ───────────────────────── */

/**
 * AI Quiz Generator: the teacher copies a ready-made JSON template from
 * ChatGPT / Gemini and pastes it here → the exam forms instantly with
 * automatic correction (correctIndex) in seconds.
 * Mode A: quizId  → append questions to an existing exam.
 * Mode B: courseId → create a new exam from the JSON (title/settings included).
 */
export async function importQuizJsonAction(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const staff = await requireStaff();
  const parsed = quizJsonSchema.safeParse({ quizId: fd.get("quizId"), courseId: fd.get("courseId"), title: str(fd, "title"), json: str(fd, "json"), jsonFile: fd.get("jsonFile") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { quizId, courseId, title } = parsed.data;
  let json = parsed.data.json ?? "";

  // A picked .json file wins over the textarea (handy for huge AI outputs)
  const file = fd.get("jsonFile");
  if (file instanceof File && file.size > 0) {
    if (file.size > 3_000_000) return { error: "الملف كبير جدًا (الحد 3 ميجابايت)" };
    json = await file.text();
  }
  if (!json.trim()) return { error: "الصق كود JSON أو ارفع ملف .json أولًا" };

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { error: "الملف ليس JSON صالحًا – تأكد من الأقواس والفواصل، أو استخدم زر «قالب جاهز»" };
  }

  const { questions: parsedQuestions, errors } = extractQuestions(data);
  if (!parsedQuestions.length) {
    return { error: `ما تم التعرف على أي سؤال صالح. ${errors.slice(0, 3).join(" | ")}` };
  }

  let targetQuizId = quizId ?? "";
  let quizCourseId = courseId ?? "";
  let quizTitle = "";

  if (!targetQuizId) {
    // Mode B – create the exam itself from the JSON
    if (!quizCourseId) return { error: "حدد الكورس أولًا" };
    const [course] = await db.select({ id: courses.id }).from(courses).where(eq(courses.id, quizCourseId)).limit(1);
    if (!course) return { error: "الكورس غير موجود" };
    const root = (typeof data === "object" && data !== null && !Array.isArray(data) ? (data as RawQuestion) : {}) as RawQuestion;
    const dur = Number(pickField(root, ["durationMinutes", "duration_minutes", "duration", "المدة"]) ?? 20);
    const pass = Number(pickField(root, ["passPercent", "pass_percent", "pass", "درجة النجاح"]) ?? 50);
    const attempts = Number(pickField(root, ["maxAttempts", "max_attempts", "attempts", "المحاولات"]) ?? 3);
    quizTitle = String(pickField(root, ["title", "exam_title", "name", "العنوان", "الاسم"]) ?? title ?? "").trim().slice(0, 150) || "امتحان مولّد بالذكاء الاصطناعي";
    const [created] = await db.insert(quizzes).values({
      courseId: quizCourseId,
      scope: "course",
      title: quizTitle,
      durationMinutes: Number.isFinite(dur) && dur > 0 ? Math.min(300, Math.round(dur)) : 20,
      passPercent: Number.isFinite(pass) ? Math.max(0, Math.min(100, Math.round(pass))) : 50,
      maxAttempts: Number.isFinite(attempts) && attempts > 0 ? Math.min(50, Math.round(attempts)) : 3,
      shuffleQuestions: true,
      showAnswers: true,
      isPublished: true,
    }).returning({ id: quizzes.id });
    targetQuizId = created.id;

    // Notify enrolled students about the new exam
    const enrolled = await db.select({ userId: enrollments.userId }).from(enrollments).where(eq(enrollments.courseId, quizCourseId));
    if (enrolled.length) {
      const chunk = 500;
      for (let i = 0; i < enrolled.length; i += chunk) {
        await db.insert(notifications).values(enrolled.slice(i, i + chunk).map((e) => ({ userId: e.userId, type: "exam" as const, title: `امتحان جديد: ${quizTitle}`, body: "تم إنشاء امتحان جديد بالذكاء الاصطناعي – جرّب نفسك!", href: `/quiz/${created.id}` })));
      }
    }
  } else {
    const [q] = await db.select({ id: quizzes.id, courseId: quizzes.courseId, title: quizzes.title }).from(quizzes).where(eq(quizzes.id, targetQuizId)).limit(1);
    if (!q) return { error: "الامتحان غير موجود" };
    quizCourseId = q.courseId;
    quizTitle = q.title;
  }

  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${questions.orderIndex}), -1)` }).from(questions).where(eq(questions.quizId, targetQuizId));
  await db.insert(questions).values(parsedQuestions.map((q, i) => ({ quizId: targetQuizId, ...q, orderIndex: Number(max) + 1 + i })));
  await audit("admin.quiz_ai_imported", { userId: staff.id, targetType: "quiz", targetId: targetQuizId, meta: { added: parsedQuestions.length, skipped: errors.length } });
  revalidateAdmin(`/admin/courses/${quizCourseId}`, `/admin/courses/${quizCourseId}/quiz/${targetQuizId}`, "/admin/exams", `/quiz/${targetQuizId}`);
  return { ok: true, message: `تم تكوين «${quizTitle}» في ثوانٍ: ${parsedQuestions.length} سؤال بتصحيح آلي${errors.length ? ` • تم تخطي ${errors.length} سؤال ناقص` : ""}` };
}

/* ───────────────────────── Messages ───────────────────────── */

export async function markMessageReadAction(fd: FormData) {
  await requireStaff();
  const id = uuidSchema.safeParse(fd.get("messageId"));
  if (!id.success) return;
  await db.update(contactMessages).set({ isRead: true }).where(eq(contactMessages.id, id.data));
  revalidatePath("/admin/messages");
}

export async function deleteMessageAction(fd: FormData) {
  await requireStaff();
  const id = uuidSchema.safeParse(fd.get("messageId"));
  if (!id.success) return;
  await db.delete(contactMessages).where(eq(contactMessages.id, id.data));
  revalidatePath("/admin/messages");
}
