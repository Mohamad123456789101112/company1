import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { BookOpen, KeyRound, Layers, PlayCircle, School } from "lucide-react";
import { db } from "@/db";
import { activationCodes, courseUnits, courses, lessons } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { CenterCodeForm } from "@/components/dashboard/code-form";
import { Badge, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "كود السنتر" };

export default async function CodesPage() {
  const user = await requireUser("/dashboard/codes");
  const history = await db
    .select({ c: activationCodes, courseTitle: courses.title, courseSlug: courses.slug, unitTitle: courseUnits.title, lessonTitle: lessons.title, lessonId: lessons.id })
    .from(activationCodes)
    .leftJoin(courses, eq(courses.id, activationCodes.courseId))
    .leftJoin(courseUnits, eq(courseUnits.id, activationCodes.unitId))
    .leftJoin(lessons, eq(lessons.id, activationCodes.lessonId))
    .where(eq(activationCodes.usedBy, user.id))
    .orderBy(desc(activationCodes.usedAt))
    .limit(50);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="طلاب السنتر" title="تفعيل كود السنتر" subtitle="الأكواد مخصصة لطلاب السنتر غير المشتركين في المنصة – كل كود يفتح محتوى محددًا (كورس / وحدة / درس)." />

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card p-6 lg:col-span-3">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow"><KeyRound className="size-6" /></span>
            <div>
              <h2 className="font-amin text-lg font-bold text-slate-900">أدخل الكود الذي أعطاه لك المستر</h2>
              <p className="text-xs text-slate-500">يُفتح المحتوى فورًا على حسابك بعد التحقق</p>
            </div>
          </div>
          <CenterCodeForm />
        </section>

        <aside className="space-y-4 lg:col-span-2">
          <div className="card p-5">
            <h3 className="flex items-center gap-2 font-amin text-sm font-bold text-slate-900"><School className="size-4 text-peach-500" /> إزاي بيشتغل؟</h3>
            <ol className="mt-3 space-y-2 font-taj text-sm leading-6 text-slate-600">
              <li className="flex gap-2"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">1</span> احصل على الكود من المستر في السنتر بعد الحصة.</li>
              <li className="flex gap-2"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">2</span> اكتبه هنا بالضبط كما هو (الحروف والأرقام).</li>
              <li className="flex gap-2"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">3</span> يُفتح لك الدرس/الوحدة/الكورس المحدد فورًا من «كورساتي».</li>
            </ol>
          </div>
          <div className="card p-5">
            <h3 className="font-amin text-sm font-bold text-slate-900">أنواع الأكواد</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><Badge tone="brand">CR</Badge> كورس كامل</li>
              <li className="flex items-center gap-2"><Badge tone="accent">UN</Badge> وحدة / فصل واحد</li>
              <li className="flex items-center gap-2"><Badge tone="violet">LS</Badge> درس واحد</li>
            </ul>
            <p className="mt-3 text-[11px] leading-5 text-slate-500">لو عايز الكورس كامل بكل مميزاته اشترك مباشرة من <Link href="/courses" className="font-bold text-brand-600 hover:underline">صفحة الكورسات</Link>.</p>
          </div>
        </aside>
      </div>

      <section>
        <h2 className="mb-3 font-amin text-lg font-bold text-slate-900">الأكواد التي فعّلتها</h2>
        {history.length === 0 ? (
          <p className="card p-6 text-center text-sm text-slate-500">لم تقم بتفعيل أي كود بعد.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>الكود</th><th>النوع</th><th>المحتوى المفتوح</th><th>تاريخ التفعيل</th><th></th></tr></thead>
              <tbody>
                {history.map(({ c, courseTitle, courseSlug, unitTitle, lessonTitle, lessonId }) => (
                  <tr key={c.id}>
                    <td className="font-mono text-xs font-bold" dir="ltr">{c.code}</td>
                    <td>{c.scope === "course" ? <Badge tone="brand"><BookOpen className="size-3" /> كورس</Badge> : c.scope === "unit" ? <Badge tone="accent"><Layers className="size-3" /> وحدة</Badge> : <Badge tone="violet"><PlayCircle className="size-3" /> درس</Badge>}</td>
                    <td className="text-sm"><span className="font-bold text-slate-900">{c.scope === "course" ? courseTitle : c.scope === "unit" ? unitTitle : lessonTitle}</span><span className="block text-[11px] text-slate-500">{courseTitle}</span></td>
                    <td className="text-xs text-slate-500">{formatDate(c.usedAt, true)}</td>
                    <td>{courseSlug && <Link href={lessonId ? `/learn/${courseSlug}/${lessonId}` : `/learn/${courseSlug}`} className="btn btn-outline btn-sm">فتح</Link>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
