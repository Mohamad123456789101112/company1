import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { CalendarClock, ClipboardList, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { courses, quizAttempts, quizzes } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getAccessibleCourseIds } from "@/lib/data";
import { Badge, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "الامتحانات" };

export default async function ExamsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const tab = sp.tab === "results" ? "results" : "available";
  const user = await requireUser("/dashboard/exams");
  const now = Date.now();
  const access = await getAccessibleCourseIds(user.id);
  const courseIds = [...access.full, ...access.partial];

  const [examRows, attempts] = await Promise.all([
    courseIds.length
      ? db.select({ q: quizzes, courseTitle: courses.title, courseSlug: courses.slug }).from(quizzes).innerJoin(courses, eq(courses.id, quizzes.courseId)).where(and(inArray(quizzes.courseId, courseIds), eq(quizzes.isPublished, true))).orderBy(asc(quizzes.availableFrom), asc(quizzes.createdAt))
      : Promise.resolve([]),
    db
      .select({ a: quizAttempts, quizTitle: quizzes.title, quizId: quizzes.id, courseTitle: courses.title })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
      .innerJoin(courses, eq(courses.id, quizzes.courseId))
      .where(eq(quizAttempts.userId, user.id))
      .orderBy(desc(quizAttempts.startedAt))
      .limit(200),
  ]);

  // Students see an exam only when they own the course, or (lesson exams) unlocked that lesson via a center code.
  const visible = examRows.filter((r) => access.full.has(r.q.courseId) || (r.q.lessonId ? access.lessonIdsByCourse.get(r.q.courseId)?.has(r.q.lessonId) : false));
  const byQuiz = new Map<string, { used: number; best: number; passed: boolean }>();
  for (const { a } of attempts) {
    const cur = byQuiz.get(a.quizId) ?? { used: 0, best: 0, passed: false };
    cur.used++;
    if (a.status === "submitted") {
      cur.best = Math.max(cur.best, a.percent);
      cur.passed = cur.passed || a.passed;
    }
    byQuiz.set(a.quizId, cur);
  }
  const statusOf = (q: (typeof visible)[number]["q"]) => {
    if (q.availableFrom && q.availableFrom.getTime() > now) return { label: "قادم", tone: "warning" as const };
    if (q.availableUntil && q.availableUntil.getTime() < now) return { label: "منتهي", tone: "neutral" as const };
    return { label: "متاح الآن", tone: "success" as const };
  };
  const submitted = attempts.filter((x) => x.a.status === "submitted");
  const avg = submitted.length ? Math.round(submitted.reduce((s, x) => s + x.a.percent, 0) / submitted.length) : 0;
  const best = submitted.reduce((m, x) => Math.max(m, x.a.percent), 0);
  const cancelled = attempts.filter((x) => x.a.status === "cancelled").length;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="الامتحانات" title="الامتحانات والنتائج" subtitle="امتحاناتك المجدولة والمتاحة وكل محاولاتك السابقة" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="امتحانات متاحة" value={visible.filter((r) => statusOf(r.q).label === "متاح الآن").length} tone="success" />
        <StatCard label="امتحانات قادمة" value={visible.filter((r) => statusOf(r.q).label === "قادم").length} tone="accent" />
        <StatCard label="متوسط درجاتك" value={`${avg}%`} hint={submitted.length ? `أعلى درجة ${best}%` : "—"} />
        <StatCard label="محاولات ملغاة" value={cancelled} tone="rose" hint="بسبب الخروج أو مخالفة القواعد" />
      </div>

      <div className="flex gap-2 border-b border-lav-200">
        {[
          { k: "available", l: "الامتحانات المتاحة", i: CalendarClock },
          { k: "results", l: "نتائجي", i: ClipboardList },
        ].map((t) => (
          <Link key={t.k} href={`/dashboard/exams?tab=${t.k}`} className={cn("-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition", tab === t.k ? "border-brand-500 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800")}>
            <t.i className="size-4" /> {t.l}
          </Link>
        ))}
      </div>

      {tab === "available" ? (
        visible.length === 0 ? (
          <EmptyState title="لا توجد امتحانات بعد" description="ستظهر هنا امتحانات الكورسات المشترك بها فور إضافتها أو جدولتها." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visible.map(({ q, courseTitle }) => {
              const st = statusOf(q);
              const mine = byQuiz.get(q.id);
              const remaining = Math.max(0, q.maxAttempts - (mine?.used ?? 0));
              return (
                <div key={q.id} className="card flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-brand-600">{courseTitle}</p>
                      <h3 className="mt-0.5 font-amin text-base font-bold text-slate-900">{q.title}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-1"><Badge tone={st.tone}>{st.label}</Badge><Badge tone={q.scope === "course" ? "brand" : q.scope === "unit" ? "accent" : "neutral"}>{q.scope === "course" ? "شامل" : q.scope === "unit" ? "وحدة" : "درس"}</Badge></div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-lav-50 p-2"><p className="font-bold text-slate-900">{q.durationMinutes} د</p><p className="text-slate-500">المدة</p></div>
                    <div className="rounded-xl bg-lav-50 p-2"><p className="font-bold text-slate-900">{q.passPercent}%</p><p className="text-slate-500">النجاح</p></div>
                    <div className="rounded-xl bg-lav-50 p-2"><p className="font-bold text-slate-900">{remaining}/{q.maxAttempts}</p><p className="text-slate-500">محاولات</p></div>
                  </div>
                  <div className="mt-3 space-y-1 text-[11px] text-slate-500">
                    {q.availableFrom && <p>يفتح: {formatDate(q.availableFrom, true)}</p>}
                    {q.availableUntil && <p>يغلق: {formatDate(q.availableUntil, true)}</p>}
                    {q.antiCheat && <p className="flex items-center gap-1 text-emerald-700"><ShieldCheck className="size-3.5" /> امتحان آمن – ممنوع الخروج من الصفحة{q.requireFullscreen ? " (ملء الشاشة)" : ""}</p>}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-lav-200 pt-3">
                    {mine?.used ? <span className="text-xs text-slate-500">أفضل نتيجة: <b className={mine.passed ? "text-emerald-600" : "text-rose-600"}>{mine.best}%</b></span> : <span className="text-xs text-slate-500">لم تحاول بعد</span>}
                    <Link href={`/quiz/${q.id}`} className={cn("btn btn-sm", st.label === "متاح الآن" && remaining > 0 ? "btn-primary" : "btn-outline")}>{st.label === "متاح الآن" && remaining > 0 ? "ادخل الامتحان" : "التفاصيل"}</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : attempts.length === 0 ? (
        <EmptyState title="لا توجد محاولات بعد" description="ستظهر نتائجك هنا بعد تسليم أول امتحان." />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>الامتحان</th><th>الكورس</th><th>الحالة</th><th>الدرجة</th><th>النسبة</th><th>التاريخ</th><th></th></tr></thead>
            <tbody>
              {attempts.map(({ a, quizTitle, quizId, courseTitle }) => (
                <tr key={a.id}>
                  <td className="font-bold text-slate-900">{quizTitle}</td>
                  <td className="text-xs text-slate-500">{courseTitle}</td>
                  <td>{a.status === "cancelled" ? <Badge tone="danger">ملغي</Badge> : a.status === "in_progress" ? <Badge tone="warning">جارٍ</Badge> : a.passed ? <Badge tone="success">ناجح</Badge> : <Badge tone="danger">راسب</Badge>}</td>
                  <td>{a.score} / {a.total}</td>
                  <td className="font-black">{a.percent}%</td>
                  <td className="text-xs text-slate-500">{formatDate(a.submittedAt ?? a.startedAt, true)}</td>
                  <td>{a.status === "in_progress" ? <Link href={`/quiz/${quizId}/attempt/${a.id}`} className="btn btn-primary btn-sm">متابعة</Link> : <Link href={`/quiz/${quizId}/result/${a.id}`} className="btn btn-outline btn-sm">التفاصيل</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
