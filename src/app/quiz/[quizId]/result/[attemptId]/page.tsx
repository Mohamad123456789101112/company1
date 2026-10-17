import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { CheckCircle2, XCircle, Trophy, RotateCcw, ArrowRight, ShieldAlert } from "lucide-react";
import { db } from "@/db";
import { courses, questions, quizAttempts, quizzes } from "@/db/schema";
import { isStaff, requireUser } from "@/lib/auth";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "نتيجة الامتحان" };

const REASONS: Record<string, string> = {
  hidden: "الانتقال إلى تبويب أو تطبيق آخر",
  leave: "مغادرة صفحة الامتحان",
  navigate: "الانتقال إلى صفحة أخرى داخل المنصة",
  fullscreen_exit: "الخروج من وضع ملء الشاشة",
  timeout: "انتهاء الوقت دون تسليم",
  blur: "تكرار الخروج من نافذة الامتحان",
  copy: "محاولات نسخ متكررة",
  paste: "محاولات لصق متكررة",
  contextmenu: "تكرار استخدام قائمة الفأرة",
  shortcut: "تكرار استخدام اختصارات ممنوعة",
  printscreen: "محاولات التقاط الشاشة",
  devtools: "محاولة فتح أدوات المطور",
};

export default async function ResultPage({ params }: { params: Promise<{ quizId: string; attemptId: string }> }) {
  const { quizId, attemptId } = await params;
  const user = await requireUser(`/quiz/${quizId}`);

  const conds = [eq(quizAttempts.id, attemptId), eq(quizAttempts.quizId, quizId)];
  if (!isStaff(user)) conds.push(eq(quizAttempts.userId, user.id));
  const [attempt] = await db.select().from(quizAttempts).where(and(...conds)).limit(1);
  if (!attempt) notFound();
  if (attempt.status === "in_progress") redirect(`/quiz/${quizId}/attempt/${attemptId}`);

  const [row] = await db.select({ quiz: quizzes, course: courses }).from(quizzes).innerJoin(courses, eq(courses.id, quizzes.courseId)).where(eq(quizzes.id, quizId)).limit(1);
  if (!row) notFound();
  const cancelled = attempt.status === "cancelled";
  const qs = cancelled ? [] : await db.select().from(questions).where(eq(questions.quizId, quizId)).orderBy(asc(questions.orderIndex));
  const showAnswers = (row.quiz.showAnswers || isStaff(user)) && !cancelled;
  const backHref = `/learn/${row.course.slug}${row.quiz.lessonId ? `/${row.quiz.lessonId}` : ""}`;

  return (
    <div className="min-h-screen bg-lav-50 py-10 dark:bg-[var(--color-surface-0)]">
      <div className="container-x max-w-3xl">
        <div className={cn("card relative overflow-hidden p-8 text-center", cancelled ? "border-rose-300" : attempt.passed ? "border-emerald-300" : "border-rose-200")}>
          <div className="grid-bg absolute inset-0" />
          <div className="relative">
            <span className={cn("mx-auto grid size-20 place-items-center rounded-full text-4xl", cancelled ? "bg-rose-50" : attempt.passed ? "bg-emerald-50" : "bg-rose-50")}>
              {cancelled ? <ShieldAlert className="size-10 text-rose-600" /> : attempt.passed ? "🎉" : "💪"}
            </span>
            <h1 className="mt-4 font-amin text-2xl font-bold text-slate-900">{cancelled ? "تم إلغاء هذه المحاولة" : attempt.passed ? "مبروك! نجحت في الامتحان" : "لم تصل لدرجة النجاح هذه المرة"}</h1>
            <p className="mt-1 text-sm text-slate-500">{row.quiz.title} • {row.course.title}</p>
            {cancelled ? (
              <div className="mx-auto mt-5 max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-800">
                <p className="font-bold">سبب الإلغاء: {REASONS[attempt.cancelReason ?? ""] ?? attempt.cancelReason}</p>
                <p className="mt-1 text-xs">تُحتسب هذه المحاولة بدرجة صفر وفق قواعد النزاهة. المخالفات المسجلة: {attempt.violations}. {attempt.cancelReason === "timeout" ? "" : "تم إبلاغ الإدارة بالواقعة."}</p>
              </div>
            ) : (
              <div className="mx-auto mt-6 flex max-w-sm items-center justify-center gap-6">
                <div>
                  <p className={cn("font-amin text-5xl font-bold", attempt.passed ? "text-emerald-600" : "text-rose-600")}>{attempt.percent}%</p>
                  <p className="text-xs text-slate-500">النسبة</p>
                </div>
                <div className="h-12 w-px bg-lav-200" />
                <div>
                  <p className="font-amin text-3xl font-bold text-slate-900">{attempt.score} / {attempt.total}</p>
                  <p className="text-xs text-slate-500">الدرجة</p>
                </div>
              </div>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link href={backHref} className="btn btn-outline"><ArrowRight className="size-4" /> العودة للكورس</Link>
              <Link href={`/quiz/${quizId}`} className="btn btn-primary"><RotateCcw className="size-4" /> صفحة الامتحان</Link>
              <Link href="/dashboard/exams?tab=results" className="btn btn-ghost"><Trophy className="size-4" /> كل نتائجي</Link>
            </div>
          </div>
        </div>

        {showAnswers ? (
          <div className="mt-8 space-y-4">
            <h2 className="font-amin text-lg font-bold text-slate-900">مراجعة الإجابات</h2>
            {qs.map((q, i) => {
              const chosen = attempt.answers[q.id];
              const correct = chosen === q.correctIndex;
              return (
                <div key={q.id} className={cn("card p-6", correct ? "border-emerald-200" : "border-rose-200")}>
                  <div className="flex items-start gap-3">
                    {correct ? <CheckCircle2 className="mt-1 size-5 shrink-0 text-emerald-500" /> : <XCircle className="mt-1 size-5 shrink-0 text-rose-500" />}
                    <div className="flex-1">
                      <p className="text-sm font-bold leading-7 text-slate-900">{i + 1}. {q.text}</p>
                      {q.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={q.imageUrl} alt="" className="mt-3 max-h-72 rounded-xl border border-lav-200" />
                      )}
                    </div>
                    <Badge tone={correct ? "success" : "danger"}>{correct ? `+${q.points}` : "0"}</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className={cn("rounded-xl border px-3 py-2 text-sm", oi === q.correctIndex ? "border-emerald-400 bg-emerald-50 text-emerald-800" : oi === chosen ? "border-rose-400 bg-rose-50 text-rose-800" : "border-lav-200 text-slate-500")}>
                        {["أ", "ب", "ج", "د", "هـ", "و"][oi]}. {opt}
                        {oi === q.correctIndex && <span className="ms-2 text-[10px] font-black">✓ الإجابة الصحيحة</span>}
                        {oi === chosen && oi !== q.correctIndex && <span className="ms-2 text-[10px] font-black">إجابتك</span>}
                      </div>
                    ))}
                  </div>
                  {chosen === undefined && <p className="mt-2 text-xs text-amber-600">لم تُجب على هذا السؤال.</p>}
                  {q.explanation && <p className="mt-3 rounded-xl bg-lav-50 px-4 py-3 text-xs leading-6 text-slate-600">💡 {q.explanation}</p>}
                </div>
              );
            })}
          </div>
        ) : (
          !cancelled && <p className="card mt-8 p-6 text-center text-sm text-slate-500">تمت إخفاء الإجابات النموذجية لهذا الامتحان بواسطة المدرس.</p>
        )}
      </div>
    </div>
  );
}
