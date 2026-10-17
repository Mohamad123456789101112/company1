import Link from "next/link";
import { asc, count, desc, eq, sql } from "drizzle-orm";
import { CalendarClock, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { courses, quizAttempts, quizzes } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { Badge, PageHeader, StatCard } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default async function AdminExams() {
  await requireStaff();
  const now = Date.now();
  const [list, stats] = await Promise.all([
    db.select({ q: quizzes, courseTitle: courses.title, courseId: courses.id }).from(quizzes).innerJoin(courses, eq(courses.id, quizzes.courseId)).orderBy(desc(quizzes.availableFrom), asc(quizzes.createdAt)).limit(300),
    db
      .select({ quizId: quizAttempts.quizId, total: count(), submitted: sql<number>`count(*) filter (where ${quizAttempts.status} = 'submitted')`, cancelled: sql<number>`count(*) filter (where ${quizAttempts.status} = 'cancelled')`, avg: sql<number>`coalesce(avg(${quizAttempts.percent}) filter (where ${quizAttempts.status} = 'submitted'), 0)` })
      .from(quizAttempts)
      .groupBy(quizAttempts.quizId),
  ]);
  const byQuiz = new Map(stats.map((s) => [s.quizId, s]));
  const status = (q: (typeof list)[number]["q"]) => {
    if (!q.isPublished) return { l: "مسودة", t: "neutral" as const };
    if (q.availableFrom && q.availableFrom.getTime() > now) return { l: "مجدول", t: "warning" as const };
    if (q.availableUntil && q.availableUntil.getTime() < now) return { l: "منتهي", t: "neutral" as const };
    return { l: "مفتوح", t: "success" as const };
  };
  const totalCancelled = stats.reduce((a, s) => a + Number(s.cancelled), 0);
  const totalSubmitted = stats.reduce((a, s) => a + Number(s.submitted), 0);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="المحتوى" title="الامتحانات" subtitle="كل امتحانات المنصة (امتحانات الدروس والامتحانات المستقلة) مع المواعيد والنتائج ومخالفات الغش" actions={<Link href="/admin/courses" className="btn btn-primary"><CalendarClock className="size-4" /> إنشاء امتحان من صفحة الكورس</Link>} />
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="إجمالي الامتحانات" value={list.length} />
        <StatCard label="مجدولة/مفتوحة" value={list.filter((r) => ["مجدول", "مفتوح"].includes(status(r.q).l)).length} tone="success" />
        <StatCard label="محاولات مُسلّمة" value={totalSubmitted} tone="violet" />
        <StatCard label="محاولات ملغاة (غش)" value={totalCancelled} tone="rose" />
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>الامتحان</th><th>الكورس</th><th>النوع</th><th>الحالة</th><th>الموعد</th><th>المدة</th><th>منع الغش</th><th>المحاولات</th><th>المتوسط</th><th></th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={10} className="py-10 text-center text-slate-500">لا توجد امتحانات بعد</td></tr>}
            {list.map(({ q, courseTitle, courseId }) => {
              const st = status(q);
              const s = byQuiz.get(q.id);
              return (
                <tr key={q.id}>
                  <td><Link href={`/admin/courses/${courseId}/quiz/${q.id}`} className="font-bold text-slate-900 hover:text-brand-600">{q.title}</Link></td>
                  <td className="text-xs text-slate-500">{courseTitle}</td>
                  <td>{q.scope === "lesson" ? <Badge tone="neutral">على درس</Badge> : q.scope === "unit" ? <Badge tone="accent">على وحدة</Badge> : <Badge tone="brand">شامل</Badge>}</td>
                  <td><Badge tone={st.t}>{st.l}</Badge></td>
                  <td className="text-xs text-slate-500">{q.availableFrom ? <>من {formatDate(q.availableFrom, true)}<br />{q.availableUntil ? `إلى ${formatDate(q.availableUntil, true)}` : ""}</> : "دائم"}</td>
                  <td className="text-xs">{q.durationMinutes} د</td>
                  <td>{q.antiCheat ? <Badge tone="success"><ShieldCheck className="size-3" /> {q.requireFullscreen ? "ملء شاشة" : "مفعّل"}</Badge> : <Badge tone="warning">معطّل</Badge>}</td>
                  <td className="text-xs">{Number(s?.submitted ?? 0)} مُسلّم {Number(s?.cancelled ?? 0) > 0 && <span className="text-rose-600">• {Number(s?.cancelled)} ملغي</span>}</td>
                  <td className="font-bold">{s ? `${Math.round(Number(s.avg))}%` : "—"}</td>
                  <td><Link href={`/admin/courses/${courseId}/quiz/${q.id}`} className="btn btn-outline btn-sm">إدارة</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
