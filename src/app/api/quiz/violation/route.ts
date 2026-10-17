import { NextResponse, type NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { questions, quizAttempts, quizzes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Violations that end the exam immediately (leaving the page / exiting fullscreen). */
const SEVERE = new Set(["hidden", "leave", "navigate", "fullscreen_exit"]);
const KNOWN = new Set([...SEVERE, "blur", "copy", "paste", "contextmenu", "shortcut", "printscreen", "devtools"]);

/**
 * Anti-cheat reporter (called with fetch keepalive / sendBeacon from the exam page).
 * Severe violations cancel the attempt; minor ones count towards the quiz's max.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { attemptId?: string; kind?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    try {
      body = JSON.parse(await request.text()) as typeof body;
    } catch {
      body = {};
    }
  }
  const attemptId = String(body.attemptId ?? "");
  const kind = String(body.kind ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(attemptId) || !KNOWN.has(kind)) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const [row] = await db
    .select({ attempt: quizAttempts, quiz: quizzes })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
    .where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.userId, user.id)))
    .limit(1);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { attempt, quiz } = row;
  if (attempt.status !== "in_progress") return NextResponse.json({ status: attempt.status, violations: attempt.violations });
  if (!quiz.antiCheat) return NextResponse.json({ status: "ignored", violations: attempt.violations });

  const violations = attempt.violations + 1;
  const severe = SEVERE.has(kind) && (kind !== "fullscreen_exit" || quiz.requireFullscreen);
  const cancel = severe || violations >= quiz.maxViolations;

  if (cancel) {
    const [{ total }] = await db.select({ total: sql<number>`coalesce(sum(${questions.points}), 0)` }).from(questions).where(eq(questions.quizId, quiz.id));
    await db
      .update(quizAttempts)
      .set({ status: "cancelled", cancelReason: kind, violations, score: 0, total: Number(total), percent: 0, passed: false, submittedAt: new Date() })
      .where(and(eq(quizAttempts.id, attempt.id), eq(quizAttempts.status, "in_progress")));
    await audit("quiz.cancelled", { userId: user.id, targetType: "quiz", targetId: quiz.id, meta: { reason: kind, violations } });
    return NextResponse.json({ status: "cancelled", violations, reason: kind });
  }

  await db.update(quizAttempts).set({ violations }).where(eq(quizAttempts.id, attempt.id));
  return NextResponse.json({ status: "warning", violations, remaining: Math.max(0, quiz.maxViolations - violations) });
}
