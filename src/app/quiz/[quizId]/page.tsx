import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, count, desc, eq } from "drizzle-orm";
import { ArrowRight, CalendarClock, ClipboardCheck, Clock, Lock, Maximize2, Repeat, ShieldCheck, Target } from "lucide-react";
import { db } from "@/db";
import { courses, lessons, questions, quizAttempts, quizzes } from "@/db/schema";
import { isStaff, requireUser } from "@/lib/auth";
import { canTakeQuiz } from "@/lib/access";
import { startQuizAction } from "@/actions/student";
import { Countdown } from "@/components/learn/countdown";
import { Alert, Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "الامتحان" };

const ERRORS: Record<string, string> = {
  max_attempts: "لقد استنفدت كل المحاولات المسموح بها في هذا الامتحان.",
  not_open: "لم يحن موعد فتح الامتحان بعد.",
  closed: "انتهى موعد هذا الامتحان.",
  prerequisite: "يجب إنهاء دروس المحتوى المرتبط بهذا الامتحان أولًا.",
};

export default async function QuizIntro({ params, searchParams }: { params: Promise<{ quizId: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { quizId } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/quiz/${quizId}`);

  const [row] = await db
    .select({ quiz: quizzes, course: courses, lesson: lessons })
    .from(quizzes)
    .innerJoin(courses, eq(courses.id, quizzes.courseId))
    .leftJoin(lessons, eq(lessons.id, quizzes.lessonId))
    .where(eq(quizzes.id, quizId))
    .limit(1);
  if (!row || (!row.quiz.isPublished && !isStaff(user))) notFound();

  const gate = await canTakeQuiz(user, row.quiz, row.lesson);
  if (!gate.ok && gate.reason !== "prerequisite") redirect(`/courses/${row.course.slug}?locked=1&exam=1`);
  const prerequisiteMissing = !gate.ok && gate.reason === "prerequisite" ? gate.missing ?? 1 : 0;

  const [attempts, [{ qCount }]] = await Promise.all([
    db.select().from(quizAttempts).where(and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.userId, user.id))).orderBy(desc(quizAttempts.startedAt)),
    db.select({ qCount: count() }).from(questions).where(eq(questions.quizId, quizId)),
  ]);
  const open = attempts.find((a) => a.status === "in_progress");
  const remaining = Math.max(0, row.quiz.maxAttempts - attempts.length);
  const now = Date.now();
  const notYet = row.quiz.availableFrom && row.quiz.availableFrom.getTime() > now;
  const closed = row.quiz.availableUntil && row.quiz.availableUntil.getTime() < now;
  const backHref = `/learn/${row.course.slug}${row.quiz.lessonId ? `/${row.quiz.lessonId}` : ""}`;

  return (
    <div className="min-h-screen bg-lav-50 py-10 dark:bg-[var(--color-surface-0)]">
      <div className="container-x max-w-3xl">
        <Link href={backHref} className="btn btn-ghost btn-sm mb-4"><ArrowRight className="size-4" /> العودة للكورس</Link>
        <div className="card relative overflow-hidden p-8">
          <div className="grid-bg absolute inset-0" />
          <div className="relative">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="violet">{row.course.title}</Badge>
              <Badge tone={row.quiz.scope === "course" ? "brand" : row.quiz.scope === "unit" ? "accent" : "neutral"}>{row.quiz.scope === "course" ? "امتحان شامل على الكورس" : row.quiz.scope === "unit" ? "امتحان على وحدة" : `امتحان على درس: ${row.lesson?.title ?? ""}`}</Badge>
            </div>
            <h1 className="mt-3 font-amin text-2xl font-bold text-slate-900 sm:text-3xl">{row.quiz.title}</h1>
            {row.quiz.description && <p className="prose-ar mt-2">{row.quiz.description}</p>}

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { i: ClipboardCheck, v: `${qCount} سؤال`, l: "عدد الأسئلة" },
                { i: Clock, v: `${row.quiz.durationMinutes} دقيقة`, l: "المدة" },
                { i: Target, v: `${row.quiz.passPercent}%`, l: "درجة النجاح" },
                { i: Repeat, v: `${remaining} / ${row.quiz.maxAttempts}`, l: "محاولات متبقية" },
              ].map((x) => (
                <div key={x.l} className="rounded-xl border border-lav-200 bg-white p-3 text-center">
                  <x.i className="mx-auto size-5 text-brand-500" />
                  <p className="mt-1 text-sm font-black text-slate-900">{x.v}</p>
                  <p className="text-[11px] text-slate-500">{x.l}</p>
                </div>
              ))}
            </div>

            {(row.quiz.availableFrom || row.quiz.availableUntil) && (
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-lav-200 bg-lav-50 px-4 py-3 text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-bold text-slate-800"><CalendarClock className="size-4 text-peach-500" /> موعد الامتحان</span>
                {row.quiz.availableFrom && <span>يفتح: <b>{formatDate(row.quiz.availableFrom, true)}</b></span>}
                {row.quiz.availableUntil && <span>يغلق: <b>{formatDate(row.quiz.availableUntil, true)}</b></span>}
              </div>
            )}

            {sp.error && ERRORS[sp.error] && <Alert tone="danger" className="mt-5">{ERRORS[sp.error]}</Alert>}

            {row.quiz.antiCheat && (
              <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-brand-800"><ShieldCheck className="size-4" /> امتحان آمن – قواعد النزاهة</p>
                <ul className="mt-2 space-y-1 text-xs leading-6 text-slate-600">
                  {row.quiz.requireFullscreen && <li className="flex items-center gap-1.5"><Maximize2 className="size-3.5 text-brand-500" /> يعمل في وضع ملء الشاشة – الخروج منه يلغي المحاولة.</li>}
                  <li className="flex items-center gap-1.5"><Lock className="size-3.5 text-brand-500" /> الانتقال لتبويب/تطبيق آخر أو تصغير النافذة = إلغاء فوري واحتساب صفر.</li>
                  <li className="flex items-center gap-1.5"><Lock className="size-3.5 text-brand-500" /> النسخ واللصق ولقطات الشاشة ممنوعة (الحد الأقصى {row.quiz.maxViolations} مخالفات بسيطة).</li>
                </ul>
              </div>
            )}

            <div className="mt-6">
              {open ? (
                <Link href={`/quiz/${quizId}/attempt/${open.id}`} className="btn btn-accent px-8 py-3">متابعة المحاولة الحالية</Link>
              ) : Number(qCount) === 0 ? (
                <Alert tone="warning">لم تتم إضافة أسئلة لهذا الامتحان بعد.</Alert>
              ) : closed ? (
                <Alert tone="warning">انتهى موعد هذا الامتحان.</Alert>
              ) : notYet ? (
                <div className="rounded-2xl border border-lav-200 bg-white p-5 text-center">
                  <Countdown to={row.quiz.availableFrom!.getTime()} label="يفتح الامتحان بعد" />
                </div>
              ) : prerequisiteMissing > 0 ? (
                <Alert tone="warning">أكمل أولًا {prerequisiteMissing} درس من المحتوى المرتبط بهذا الامتحان (اضغط «تحديد كمكتمل» بعد مشاهدة كل درس) ثم عُد لبدء الامتحان.</Alert>
              ) : remaining > 0 ? (
                <form action={startQuizAction}>
                  <input type="hidden" name="quizId" value={quizId} />
                  <button className="btn btn-primary shine px-8 py-3 text-base">ابدأ الامتحان الآن</button>
                </form>
              ) : (
                <Alert tone="warning">لا توجد محاولات متبقية.</Alert>
              )}
            </div>
          </div>
        </div>

        {attempts.filter((a) => a.status !== "in_progress").length > 0 && (
          <div className="card mt-6 p-5">
            <h2 className="mb-3 text-sm font-black text-slate-900">محاولاتك السابقة</h2>
            <ul className="divide-y divide-lav-200">
              {attempts.filter((a) => a.status !== "in_progress").map((a, i, arr) => (
                <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-slate-600">محاولة {arr.length - i} • {formatDate(a.submittedAt, true)}</span>
                  <span className="flex items-center gap-3">
                    {a.status === "cancelled" ? <Badge tone="danger">ملغاة ({a.cancelReason})</Badge> : <Badge tone={a.passed ? "success" : "danger"}>{a.percent}%</Badge>}
                    <Link href={`/quiz/${quizId}/result/${a.id}`} className="text-xs font-bold text-brand-600 hover:underline">التفاصيل</Link>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
