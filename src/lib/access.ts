import "server-only";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { enrollments, lessonAccess, lessonProgress, lessons, quizAttempts, quizzes, type User } from "@/db/schema";

/** Full-course access = active (non-expired) enrollment. */
export async function hasCourseAccess(userId: string, courseId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId), or(isNull(enrollments.expiresAt), gt(enrollments.expiresAt, new Date()))))
    .limit(1);
  return Boolean(row);
}

/** Lessons unlocked individually (center codes for a unit / a lesson). */
export async function getLessonAccessIds(userId: string, courseId: string): Promise<Set<string>> {
  const rows = await db
    .select({ lessonId: lessonAccess.lessonId })
    .from(lessonAccess)
    .where(and(eq(lessonAccess.userId, userId), eq(lessonAccess.courseId, courseId), or(isNull(lessonAccess.expiresAt), gt(lessonAccess.expiresAt, new Date()))));
  return new Set(rows.map((r) => r.lessonId));
}

export type AccessState = { full: boolean; lessonIds: Set<string> };

export async function getAccessState(user: Pick<User, "id" | "role"> | null | undefined, courseId: string): Promise<AccessState> {
  if (!user) return { full: false, lessonIds: new Set() };
  if (user.role !== "student") return { full: true, lessonIds: new Set() };
  if (await hasCourseAccess(user.id, courseId)) return { full: true, lessonIds: new Set() };
  return { full: false, lessonIds: await getLessonAccessIds(user.id, courseId) };
}

export function canOpenLesson(state: AccessState, lesson: { id: string; isFreePreview: boolean }): boolean {
  return state.full || lesson.isFreePreview || state.lessonIds.has(lesson.id);
}

export async function canAccessLesson(user: Pick<User, "id" | "role"> | null | undefined, lesson: { id: string; courseId: string; isFreePreview: boolean }): Promise<boolean> {
  if (lesson.isFreePreview && user) return true;
  const state = await getAccessState(user, lesson.courseId);
  return canOpenLesson(state, lesson);
}

/** True when the student has the whole course or at least one unlocked lesson in it. */
export async function hasAnyCourseAccess(user: Pick<User, "id" | "role">, courseId: string): Promise<boolean> {
  const state = await getAccessState(user, courseId);
  return state.full || state.lessonIds.size > 0;
}

/**
 * Exam gate: the student must own the course (paid & approved / free / admin), or – for
 * lesson/unit exams – have the specific lesson(s) unlocked (center code / free preview).
 * Optional prerequisites: finish the linked content first.
 */
export async function canTakeQuiz(
  user: Pick<User, "id" | "role">,
  quiz: { courseId: string; lessonId: string | null; unitId?: string | null; scope?: "course" | "unit" | "lesson"; requireLessonComplete?: boolean },
  lesson: { id: string; courseId: string; isFreePreview: boolean } | null,
): Promise<{ ok: boolean; reason?: "not_enrolled" | "lesson_locked" | "prerequisite"; missing?: number }> {
  if (user.role !== "student") return { ok: true };
  const state = await getAccessState(user, quiz.courseId);
  const scope = quiz.scope ?? (quiz.lessonId ? "lesson" : "course");

  let allowed = state.full;
  if (!allowed && scope === "lesson" && lesson) allowed = lesson.isFreePreview || state.lessonIds.has(lesson.id);
  if (!allowed && scope === "unit" && quiz.unitId) {
    const unitLessons = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.unitId, quiz.unitId));
    allowed = unitLessons.length > 0 && unitLessons.every((l) => state.lessonIds.has(l.id));
  }
  if (!allowed) return { ok: false, reason: scope === "course" ? "not_enrolled" : "lesson_locked" };

  if (quiz.requireLessonComplete) {
    let required: string[] = [];
    if (scope === "lesson" && lesson) required = [lesson.id];
    else if (scope === "unit" && quiz.unitId) required = (await db.select({ id: lessons.id }).from(lessons).where(and(eq(lessons.unitId, quiz.unitId), eq(lessons.isPublished, true), eq(lessons.type, "video")))).map((l) => l.id);
    else required = (await db.select({ id: lessons.id }).from(lessons).where(and(eq(lessons.courseId, quiz.courseId), eq(lessons.isPublished, true), eq(lessons.type, "video")))).map((l) => l.id);
    if (required.length) {
      const done = new Set((await db.select({ id: lessonProgress.lessonId }).from(lessonProgress).where(and(eq(lessonProgress.userId, user.id), eq(lessonProgress.courseId, quiz.courseId)))).map((r) => r.id));
      const missing = required.filter((id) => !done.has(id)).length;
      if (missing > 0) return { ok: false, reason: "prerequisite", missing };
    }
  }
  return { ok: true };
}

/** Lessons gated behind passing an exam ("unlock after pass") that the student has NOT passed yet. */
export async function getGatedLessonIds(userId: string, courseId: string): Promise<Set<string>> {
  const gates = await db.select({ quizId: quizzes.id, unlockLessonId: quizzes.unlockLessonId }).from(quizzes).where(and(eq(quizzes.courseId, courseId), eq(quizzes.isPublished, true)));
  const relevant = gates.filter((g) => g.unlockLessonId);
  if (!relevant.length) return new Set();
  const passed = new Set((await db.select({ quizId: quizAttempts.quizId }).from(quizAttempts).where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.passed, true)))).map((r) => r.quizId));
  return new Set(relevant.filter((g) => !passed.has(g.quizId)).map((g) => g.unlockLessonId!));
}
