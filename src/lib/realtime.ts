import "server-only";
import { and, count, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { courses, enrollments, lessonAccess, notifications, paymentRequests, quizzes } from "@/db/schema";

/**
 * Snapshot of everything a student dashboard needs to know "right now".
 * The SSE endpoint polls this and pushes a `change` event whenever the
 * fingerprint differs – which lets the client refresh instantly when the
 * teacher approves a payment, adds an exam, unlocks a course, etc.
 */
export async function studentSnapshot(userId: string) {
  const now = new Date();
  const [enr, access, pay, [unread], latestNotif] = await Promise.all([
    db.select({ courseId: enrollments.courseId, createdAt: enrollments.createdAt }).from(enrollments).where(and(eq(enrollments.userId, userId), or(isNull(enrollments.expiresAt), gt(enrollments.expiresAt, now)))),
    db.select({ c: count() }).from(lessonAccess).where(eq(lessonAccess.userId, userId)),
    db.select({ id: paymentRequests.id, status: paymentRequests.status, reviewedAt: paymentRequests.reviewedAt }).from(paymentRequests).where(eq(paymentRequests.userId, userId)).orderBy(desc(paymentRequests.createdAt)).limit(20),
    db.select({ c: count() }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false))),
    db.select({ id: notifications.id, title: notifications.title, body: notifications.body, href: notifications.href, type: notifications.type, createdAt: notifications.createdAt }).from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(1),
  ]);
  const courseIds = enr.map((e) => e.courseId);
  const quizRows = courseIds.length
    ? await db.select({ id: quizzes.id, availableFrom: quizzes.availableFrom, isPublished: quizzes.isPublished }).from(quizzes).where(inArray(quizzes.courseId, courseIds))
    : [];
  const fingerprint = JSON.stringify({
    e: enr.map((x) => x.courseId).sort(),
    a: Number(access[0]?.c ?? 0),
    p: pay.map((x) => `${x.id}:${x.status}`),
    q: quizRows.map((x) => `${x.id}:${x.isPublished ? 1 : 0}:${x.availableFrom?.getTime() ?? 0}`).sort(),
    n: Number(unread?.c ?? 0),
    ln: latestNotif[0]?.id ?? null,
  });
  return { fingerprint, unread: Number(unread?.c ?? 0), latest: latestNotif[0] ?? null };
}

/** Admin counters that should update live (new payments / messages). */
export async function adminSnapshot() {
  const [[pending], latest] = await Promise.all([
    db.select({ c: count() }).from(paymentRequests).where(eq(paymentRequests.status, "pending")),
    db
      .select({ id: paymentRequests.id, amount: paymentRequests.amount, createdAt: paymentRequests.createdAt, courseTitle: courses.title })
      .from(paymentRequests)
      .leftJoin(courses, eq(courses.id, paymentRequests.courseId))
      .where(eq(paymentRequests.status, "pending"))
      .orderBy(desc(paymentRequests.createdAt))
      .limit(1),
  ]);
  const fingerprint = JSON.stringify({ p: Number(pending?.c ?? 0), l: latest[0]?.id ?? null });
  return { fingerprint, pending: Number(pending?.c ?? 0), latest: latest[0] ?? null };
}
