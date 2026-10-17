import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { ArrowRight, Download, ShieldAlert, Trash2 } from "lucide-react";
import { db } from "@/db";
import { courseUnits, lessons, questions, quizAttempts, quizzes, users } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { deleteQuestionAction, deleteQuizAction } from "@/actions/admin";
import { BulkQuestionsForm, QuestionForm, QuizForm } from "@/components/admin/forms";
import { Collapsible, ConfirmForm } from "@/components/ui-client";
import { Badge, PageHeader, StatCard } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default async function AdminQuizPage({ params }: { params: Promise<{ id: string; quizId: string }> }) {
  await requireStaff();
  const { id, quizId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(quizId)) notFound();
  const [quiz] = await db.select().from(quizzes).where(and(eq(quizzes.id, quizId), eq(quizzes.courseId, id))).limit(1);
  if (!quiz) notFound();
  const [units, ls] = await Promise.all([
    db.select({ id: courseUnits.id, title: courseUnits.title }).from(courseUnits).where(eq(courseUnits.courseId, id)).orderBy(asc(courseUnits.orderIndex)),
    db.select({ id: lessons.id, title: lessons.title, type: lessons.type, unitId: lessons.unitId }).from(lessons).where(eq(lessons.courseId, id)).orderBy(asc(lessons.orderIndex)),
  ]);
  const tree = units.map((u) => ({ id: u.id, title: u.title, lessons: ls.filter((l) => l.unitId === u.id).map((l) => ({ id: l.id, title: l.title, type: l.type })) }));
  const [qs, attempts] = await Promise.all([
    db.select().from(questions).where(eq(questions.quizId, quizId)).orderBy(asc(questions.orderIndex)),
    db.select({ a: quizAttempts, name: users.name, phone: users.phone, userId: users.id }).from(quizAttempts).innerJoin(users, eq(users.id, quizAttempts.userId)).where(eq(quizAttempts.quizId, quizId)).orderBy(desc(quizAttempts.startedAt)).limit(500),
  ]);
  const submitted = attempts.filter((x) => x.a.status === "submitted");
  const cancelled = attempts.filter((x) => x.a.status === "cancelled");
  const avg = submitted.length ? Math.round(submitted.reduce((s, x) => s + x.a.percent, 0) / submitted.length) : 0;
  const passRate = submitted.length ? Math.round((submitted.filter((x) => x.a.passed).length / submitted.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <Link href={`/admin/courses/${id}`} className="btn btn-ghost btn-sm"><ArrowRight className="size-4" /> العودة للكورس</Link>
      <PageHeader
        eyebrow={quiz.scope === "lesson" ? "امتحان على درس" : quiz.scope === "unit" ? "امتحان على وحدة" : "امتحان شامل على الكورس"}
        title={quiz.title}
        subtitle={`${qs.length} سؤال • ${attempts.length} محاولة • ${quiz.availableFrom ? `يفتح ${formatDate(quiz.availableFrom, true)}` : "متاح دائمًا"}`}
        actions={
          <>
            <a href={`/api/admin/quiz/${quiz.id}/export`} className="btn btn-outline"><Download className="size-4" /> تصدير النتائج CSV</a>
            <ConfirmForm action={deleteQuizAction} message="حذف الامتحان وكل نتائجه نهائيًا؟">
              <input type="hidden" name="quizId" value={quiz.id} />
              <input type="hidden" name="courseId" value={id} />
              <button className="btn btn-danger"><Trash2 className="size-4" /> حذف الامتحان</button>
            </ConfirmForm>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="محاولات مُسلّمة" value={submitted.length} />
        <StatCard label="متوسط الدرجات" value={`${avg}%`} tone="success" />
        <StatCard label="نسبة النجاح" value={`${passRate}%`} tone="violet" />
        <StatCard label="ملغاة (غش/خروج)" value={cancelled.length} tone="rose" />
      </div>
      <Collapsible title="إعدادات الامتحان (الربط، المدة، الموعد، منع الغش)">
        <QuizForm quiz={quiz} tree={tree} />
      </Collapsible>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-black text-slate-900">إضافة سؤال واحد</h2>
          <QuestionForm quizId={quiz.id} />
        </section>
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-black text-slate-900">استيراد أسئلة بالجملة (نسخ/لصق من Word)</h2>
          <BulkQuestionsForm quizId={quiz.id} />
        </section>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-black text-slate-900"><ShieldAlert className="size-4 text-peach-500" /> نتائج الطلاب</h2>
        {attempts.length === 0 ? (
          <p className="text-sm text-slate-500">لا توجد محاولات بعد.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>الطالب</th><th>الحالة</th><th>الدرجة</th><th>النسبة</th><th>مخالفات</th><th>بدأ</th><th>سلّم</th><th></th></tr></thead>
              <tbody>
                {attempts.map(({ a, name, phone, userId }) => (
                  <tr key={a.id}>
                    <td><Link href={`/admin/students/${userId}`} className="font-bold text-slate-900 hover:text-brand-600">{name}</Link><span className="block text-[10px] text-slate-500" dir="ltr">{phone}</span></td>
                    <td>{a.status === "cancelled" ? <Badge tone="danger">ملغي: {a.cancelReason}</Badge> : a.status === "in_progress" ? <Badge tone="warning">جارٍ</Badge> : a.passed ? <Badge tone="success">ناجح</Badge> : <Badge tone="neutral">راسب</Badge>}</td>
                    <td>{a.score} / {a.total}</td>
                    <td className="font-bold">{a.percent}%</td>
                    <td className={a.violations > 0 ? "font-bold text-rose-600" : ""}>{a.violations}</td>
                    <td className="text-xs text-slate-500">{formatDate(a.startedAt, true)}</td>
                    <td className="text-xs text-slate-500">{formatDate(a.submittedAt, true)}</td>
                    <td>{a.status !== "in_progress" && <Link href={`/quiz/${quiz.id}/result/${a.id}`} className="btn btn-outline btn-sm">عرض</Link>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <h2 className="text-lg font-black text-slate-900">الأسئلة</h2>
      {qs.length === 0 && <p className="card p-6 text-center text-sm text-slate-500">لا توجد أسئلة بعد.</p>}
      <div className="space-y-3">
        {qs.map((q, i) => (
          <details key={q.id} className="card group">
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4">
              <span className="flex items-start gap-3 text-sm">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-xs font-black text-violet-700">{i + 1}</span>
                <span className="font-bold text-slate-900">{q.text}</span>
              </span>
              <span className="flex items-center gap-2">
                <Badge tone="success">الإجابة: {["أ", "ب", "ج", "د", "هـ", "و"][q.correctIndex]}</Badge>
                <Badge tone="neutral">{q.points} درجة</Badge>
              </span>
            </summary>
            <div className="border-t border-slate-200 p-4">
              <QuestionForm quizId={quiz.id} question={q} />
              <ConfirmForm action={deleteQuestionAction} message="حذف هذا السؤال؟" className="mt-3">
                <input type="hidden" name="questionId" value={q.id} />
                <input type="hidden" name="quizId" value={quiz.id} />
                <button className="btn btn-danger btn-sm"><Trash2 className="size-3.5" /> حذف السؤال</button>
              </ConfirmForm>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
