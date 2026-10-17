import "server-only";
import { and, asc, count, desc, eq, gt, inArray, isNull, or, sum } from "drizzle-orm";
import { db } from "@/db";
import { announcements, courseUnits, courses, enrollments, lessonAccess, lessonProgress, lessons, notifications, quizzes, testimonials, type Grade } from "@/db/schema";
import type { CourseCardData } from "@/components/course-card";

type CourseStats = Record<string, { lessonsCount: number; durationMinutes: number }>;

async function lessonStats(courseIds: string[]): Promise<CourseStats> {
  if (!courseIds.length) return {};
  const rows = await db
    .select({ courseId: lessons.courseId, c: count(), d: sum(lessons.durationMinutes) })
    .from(lessons)
    .where(and(inArray(lessons.courseId, courseIds), eq(lessons.isPublished, true)))
    .groupBy(lessons.courseId);
  const out: CourseStats = {};
  for (const r of rows) out[r.courseId] = { lessonsCount: Number(r.c), durationMinutes: Number(r.d ?? 0) };
  return out;
}

export async function getPublishedCourses(opts: { grade?: Grade; featured?: boolean; limit?: number } = {}): Promise<CourseCardData[]> {
  const conds = [eq(courses.isPublished, true)];
  if (opts.grade) conds.push(eq(courses.grade, opts.grade));
  if (opts.featured) conds.push(eq(courses.isFeatured, true));
  let q = db.select().from(courses).where(and(...conds)).orderBy(asc(courses.orderIndex), desc(courses.createdAt)).$dynamic();
  if (opts.limit) q = q.limit(opts.limit);
  const rows = await q;
  const stats = await lessonStats(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, ...(stats[r.id] ?? { lessonsCount: 0, durationMinutes: 0 }) }));
}

export async function getCourseBySlug(slug: string) {
  const [course] = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);
  return course ?? null;
}

export async function getCourseById(id: string) {
  const [course] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  return course ?? null;
}

export type CurriculumUnit = Awaited<ReturnType<typeof getCurriculum>>[number];

export async function getCurriculum(courseId: string, includeUnpublished = false) {
  const units = await db.select().from(courseUnits).where(eq(courseUnits.courseId, courseId)).orderBy(asc(courseUnits.orderIndex), asc(courseUnits.createdAt));
  const conds = [eq(lessons.courseId, courseId)];
  if (!includeUnpublished) conds.push(eq(lessons.isPublished, true));
  const ls = await db
    .select({
      id: lessons.id,
      unitId: lessons.unitId,
      title: lessons.title,
      type: lessons.type,
      durationMinutes: lessons.durationMinutes,
      isFreePreview: lessons.isFreePreview,
      isPublished: lessons.isPublished,
      orderIndex: lessons.orderIndex,
    })
    .from(lessons)
    .where(and(...conds))
    .orderBy(asc(lessons.orderIndex), asc(lessons.createdAt));
  const qz = await db.select({ id: quizzes.id, lessonId: quizzes.lessonId }).from(quizzes).where(and(eq(quizzes.courseId, courseId), eq(quizzes.isPublished, true)));
  const firstQuizByLesson = new Map<string, string>();
  for (const q of qz) if (q.lessonId && !firstQuizByLesson.has(q.lessonId)) firstQuizByLesson.set(q.lessonId, q.id);
  const withQuiz = ls.map((l) => ({ ...l, quizId: firstQuizByLesson.get(l.id) ?? null }));
  return units.map((u) => ({ ...u, lessons: withQuiz.filter((l) => l.unitId === u.id) }));
}

/** Course exams. By default only course/unit-scoped ones (lesson exams live inside their lesson); `all` returns every exam. */
export async function getCourseExams(courseId: string, includeUnpublished = false, all = false) {
  const conds = [eq(quizzes.courseId, courseId)];
  if (!all) conds.push(isNull(quizzes.lessonId));
  if (!includeUnpublished) conds.push(eq(quizzes.isPublished, true));
  return db.select().from(quizzes).where(and(...conds)).orderBy(asc(quizzes.availableFrom), asc(quizzes.createdAt));
}

/** All exams attached to a specific lesson (several allowed). */
export async function getLessonExams(lessonId: string) {
  return db.select().from(quizzes).where(and(eq(quizzes.lessonId, lessonId), eq(quizzes.isPublished, true))).orderBy(asc(quizzes.createdAt));
}

/** Course ids the student can see: full enrollments + courses with at least one unlocked lesson. */
export async function getAccessibleCourseIds(userId: string): Promise<{ full: Set<string>; partial: Set<string>; lessonIdsByCourse: Map<string, Set<string>> }> {
  const now = new Date();
  const enr = await db
    .select({ courseId: enrollments.courseId })
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), or(isNull(enrollments.expiresAt), gt(enrollments.expiresAt, now))));
  const full = new Set(enr.map((e) => e.courseId));
  const la = await db
    .select({ courseId: lessonAccess.courseId, lessonId: lessonAccess.lessonId })
    .from(lessonAccess)
    .where(and(eq(lessonAccess.userId, userId), or(isNull(lessonAccess.expiresAt), gt(lessonAccess.expiresAt, now))));
  const lessonIdsByCourse = new Map<string, Set<string>>();
  const partial = new Set<string>();
  for (const r of la) {
    if (!lessonIdsByCourse.has(r.courseId)) lessonIdsByCourse.set(r.courseId, new Set());
    lessonIdsByCourse.get(r.courseId)!.add(r.lessonId);
    if (!full.has(r.courseId)) partial.add(r.courseId);
  }
  return { full, partial, lessonIdsByCourse };
}

export async function getUserCourses(userId: string): Promise<CourseCardData[]> {
  const access = await getAccessibleCourseIds(userId);
  const ids = [...access.full, ...access.partial];
  if (!ids.length) return [];
  const rows = await db.select().from(courses).where(inArray(courses.id, ids)).orderBy(asc(courses.orderIndex), desc(courses.createdAt));
  const stats = await lessonStats(ids);
  const progress = await db
    .select({ courseId: lessonProgress.courseId, c: count() })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), inArray(lessonProgress.courseId, ids)))
    .groupBy(lessonProgress.courseId);
  const done: Record<string, number> = {};
  for (const p of progress) done[p.courseId] = Number(p.c);
  return rows.map((r) => {
    const s = stats[r.id] ?? { lessonsCount: 0, durationMinutes: 0 };
    const partial = access.partial.has(r.id);
    const denominator = partial ? (access.lessonIdsByCourse.get(r.id)?.size ?? 0) : s.lessonsCount;
    const pct = denominator ? Math.min(100, Math.round(((done[r.id] ?? 0) / denominator) * 100)) : 0;
    return { ...r, ...s, enrolled: true, partial, progress: pct };
  });
}

export async function getCompletedLessonIds(userId: string, courseId: string): Promise<Set<string>> {
  const rows = await db
    .select({ lessonId: lessonProgress.lessonId })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.courseId, courseId)));
  return new Set(rows.map((r) => r.lessonId));
}

export async function getAnnouncements(grade?: Grade | null, limit = 10) {
  const conds = [eq(announcements.isPublished, true)];
  if (grade) conds.push(or(isNull(announcements.grade), eq(announcements.grade, grade))!);
  return db.select().from(announcements).where(and(...conds)).orderBy(desc(announcements.isPinned), desc(announcements.createdAt)).limit(limit);
}

export async function getTestimonials(limit = 12) {
  return db.select().from(testimonials).where(eq(testimonials.isPublished, true)).orderBy(asc(testimonials.orderIndex), desc(testimonials.createdAt)).limit(limit);
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const [r] = await db.select({ c: count() }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return Number(r?.c ?? 0);
}

export async function getRecentNotifications(userId: string, limit = 8) {
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function getPublicStats() {
  const [c] = await db.select({ c: count() }).from(courses).where(eq(courses.isPublished, true));
  const [l] = await db.select({ c: count() }).from(lessons).where(eq(lessons.isPublished, true));
  const [q] = await db.select({ c: count() }).from(quizzes).where(eq(quizzes.isPublished, true));
  return { courses: Number(c?.c ?? 0), lessons: Number(l?.c ?? 0), quizzes: Number(q?.c ?? 0) };
}
