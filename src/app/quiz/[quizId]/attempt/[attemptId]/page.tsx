import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { questions, quizAttempts, quizzes } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { QuizRunner, type RunnerQuestion } from "@/components/learn/quiz-runner";
import { maskPhone } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "أداء الامتحان", robots: { index: false, follow: false } };

/** Deterministic shuffle seeded by the attempt id so re-renders keep the same order. */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  const rand = () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default async function AttemptPage({ params }: { params: Promise<{ quizId: string; attemptId: string }> }) {
  const { quizId, attemptId } = await params;
  const user = await requireUser(`/quiz/${quizId}`);

  const [attempt] = await db
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.quizId, quizId), eq(quizAttempts.userId, user.id)))
    .limit(1);
  if (!attempt) notFound();
  if (attempt.status !== "in_progress") redirect(`/quiz/${quizId}/result/${attemptId}`);

  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
  if (!quiz) notFound();

  const deadline = Math.min(attempt.startedAt.getTime() + quiz.durationMinutes * 60_000, quiz.availableUntil?.getTime() ?? Infinity);
  if (Date.now() > deadline + 45_000) redirect(`/quiz/${quizId}`);

  // Never send correctIndex / explanation to the client during the attempt.
  const rows = await db
    .select({ id: questions.id, text: questions.text, imageUrl: questions.imageUrl, options: questions.options, points: questions.points })
    .from(questions)
    .where(eq(questions.quizId, quizId))
    .orderBy(asc(questions.orderIndex));
  const list: RunnerQuestion[] = quiz.shuffleQuestions ? seededShuffle(rows, attempt.id) : rows;

  return (
    <div className="min-h-screen bg-lav-50 py-6 dark:bg-[var(--color-surface-0)]">
      <style>{`@media print { body { display: none !important; } }`}</style>
      <div className="container-x max-w-3xl">
        <h1 className="mb-6 font-amin text-xl font-bold text-slate-900">{quiz.title}</h1>
        <QuizRunner
          attemptId={attempt.id}
          quizId={quiz.id}
          questions={list}
          deadline={deadline}
          settings={{ requireFullscreen: quiz.requireFullscreen, antiCheat: quiz.antiCheat, maxViolations: quiz.maxViolations }}
          watermark={`${user.name} • ${maskPhone(user.phone)} • ${attempt.id.slice(0, 8)}`}
        />
      </div>
    </div>
  );
}
