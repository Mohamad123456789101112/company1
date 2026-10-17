import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { BookOpen, CalendarClock, CheckCircle2, Infinity as InfinityIcon, KeyRound, Lock, ShoppingBag } from "lucide-react";
import { db } from "@/db";
import { courses, enrollments, lessonAccess, lessons, paymentRequests } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { Badge, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { formatDate, formatMoney, gradeLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "اشتراكاتي" };

const SOURCE: Record<string, { label: string; tone: "success" | "brand" | "accent" | "neutral" | "violet" }> = {
  purchase: { label: "شراء مؤكد", tone: "success" },
  wallet: { label: "شراء", tone: "success" },
  free: { label: "كورس مجاني", tone: "brand" },
  code: { label: "كود سنتر", tone: "accent" },
  admin: { label: "تفعيل من الإدارة", tone: "violet" },
};

export default async function SubscriptionsPage() {
  const user = await requireUser("/dashboard/subscriptions");
  const now = new Date();
  const [enr, partial, pending, approvedPayments] = await Promise.all([
    db
      .select({ e: enrollments, c: courses })
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .where(eq(enrollments.userId, user.id))
      .orderBy(desc(enrollments.createdAt)),
    db
      .select({ courseId: lessonAccess.courseId, courseTitle: courses.title, courseSlug: courses.slug, lessonTitle: lessons.title, lessonId: lessons.id, expiresAt: lessonAccess.expiresAt, createdAt: lessonAccess.createdAt })
      .from(lessonAccess)
      .innerJoin(courses, eq(courses.id, lessonAccess.courseId))
      .innerJoin(lessons, eq(lessons.id, lessonAccess.lessonId))
      .where(and(eq(lessonAccess.userId, user.id), or(isNull(lessonAccess.expiresAt), gt(lessonAccess.expiresAt, now))))
      .orderBy(desc(lessonAccess.createdAt)),
    db.select({ p: paymentRequests, title: courses.title, slug: courses.slug }).from(paymentRequests).leftJoin(courses, eq(courses.id, paymentRequests.courseId)).where(and(eq(paymentRequests.userId, user.id), eq(paymentRequests.status, "pending"))),
    db.select({ amount: paymentRequests.amount }).from(paymentRequests).where(and(eq(paymentRequests.userId, user.id), eq(paymentRequests.status, "approved"))),
  ]);

  const active = enr.filter(({ e }) => !e.expiresAt || e.expiresAt > now);
  const expired = enr.filter(({ e }) => e.expiresAt && e.expiresAt <= now);
  const spent = approvedPayments.reduce((a, p) => a + p.amount, 0);
  const partialByCourse = new Map<string, { title: string; slug: string; lessons: typeof partial }>();
  for (const r of partial) {
    if (!partialByCourse.has(r.courseId)) partialByCourse.set(r.courseId, { title: r.courseTitle, slug: r.courseSlug, lessons: [] });
    partialByCourse.get(r.courseId)!.lessons.push(r);
  }
  const fullIds = new Set(active.map(({ c }) => c.id));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="الاشتراك" title="اشتراكاتي" subtitle="كل الكورسات التي اشتركت فيها – مدفوعة أو مجانية أو بكود سنتر – مع حالة كل اشتراك ومدته" actions={<Link href="/courses" className="btn btn-primary"><ShoppingBag className="size-4" /> اشترك في كورس جديد</Link>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="اشتراكات نشطة" value={active.length} icon={<CheckCircle2 className="size-5" />} tone="success" />
        <StatCard label="دروس مفتوحة بكود سنتر" value={partial.length} icon={<KeyRound className="size-5" />} tone="accent" />
        <StatCard label="طلبات قيد التأكيد" value={pending.length} icon={<CalendarClock className="size-5" />} tone="violet" />
        <StatCard label="إجمالي ما دفعته" value={formatMoney(spent)} icon={<ShoppingBag className="size-5" />} />
      </div>

      {pending.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-bold">طلبات بانتظار تأكيد المستر:</p>
          <ul className="mt-1 list-inside list-disc text-xs">
            {pending.map(({ p, title }) => <li key={p.id}>{title ?? "—"} • {formatMoney(p.amount)} • {formatDate(p.createdAt, true)}</li>)}
          </ul>
          <Link href="/dashboard/purchases" className="btn btn-accent btn-sm mt-3">متابعة الطلبات</Link>
        </div>
      )}

      <section>
        <h2 className="mb-3 font-amin text-lg font-bold text-slate-900">الكورسات المشترك بها</h2>
        {active.length === 0 ? (
          <EmptyState title="لا توجد اشتراكات نشطة" description="اشترك في كورس صفك الدراسي لتفتح الدروس والامتحانات." action={<Link href="/courses" className="btn btn-primary">تصفح الكورسات</Link>} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {active.map(({ e, c }) => {
              const src = SOURCE[e.source] ?? SOURCE.purchase;
              const daysLeft = e.expiresAt ? Math.max(0, Math.ceil((e.expiresAt.getTime() - now.getTime()) / 86_400_000)) : null;
              return (
                <div key={e.id} className="card flex gap-4 p-4">
                  {c.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.coverImage} alt="" className="hidden h-24 w-36 shrink-0 rounded-xl object-cover sm:block" />
                  ) : (
                    <div className="hidden h-24 w-36 shrink-0 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 sm:block" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="brand">{gradeLabel(c.grade)}</Badge>
                      <Badge tone={src.tone}>{src.label}</Badge>
                    </div>
                    <h3 className="mt-1.5 font-amin text-base font-bold text-slate-900">{c.title}</h3>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                      <span>تاريخ الاشتراك: <b className="text-slate-800">{formatDate(e.createdAt)}</b></span>
                      <span>المدفوع: <b className="text-slate-800">{e.pricePaid ? formatMoney(e.pricePaid) : "مجاني"}</b></span>
                      <span className="col-span-2 flex items-center gap-1">
                        {e.expiresAt ? <><CalendarClock className="size-3.5 text-peach-500" /> ينتهي {formatDate(e.expiresAt)} <b className={daysLeft !== null && daysLeft <= 7 ? "text-rose-600" : "text-slate-800"}>({daysLeft} يوم متبقٍ)</b></> : <><InfinityIcon className="size-3.5 text-emerald-500" /> وصول غير محدود المدة</>}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Link href={`/learn/${c.slug}`} className="btn btn-primary btn-sm"><BookOpen className="size-3.5" /> ادخل الكورس</Link>
                      <Link href={`/dashboard/exams`} className="btn btn-outline btn-sm">الامتحانات</Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {partialByCourse.size > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-amin text-lg font-bold text-slate-900"><KeyRound className="size-5 text-peach-500" /> محتوى مفتوح بأكواد السنتر</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[...partialByCourse.entries()].filter(([id]) => !fullIds.has(id)).map(([id, g]) => (
              <div key={id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-amin text-base font-bold text-slate-900">{g.title}</h3>
                  <Badge tone="accent">{g.lessons.length} درس</Badge>
                </div>
                <ul className="mt-2 space-y-1 text-xs">
                  {g.lessons.slice(0, 6).map((l) => (
                    <li key={l.lessonId} className="flex items-center justify-between rounded-lg bg-lav-50 px-2 py-1.5"><span className="truncate text-slate-800">{l.lessonTitle}</span><Link href={`/learn/${g.slug}/${l.lessonId}`} className="shrink-0 font-bold text-brand-600 hover:underline">فتح</Link></li>
                  ))}
                  {g.lessons.length > 6 && <li className="text-[11px] text-slate-500">+{g.lessons.length - 6} درس آخر</li>}
                </ul>
                <Link href={`/checkout/${g.slug}`} className="btn btn-outline btn-sm mt-3 w-full"><Lock className="size-3.5" /> اشترك في الكورس كاملًا</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {expired.length > 0 && (
        <section>
          <h2 className="mb-3 font-amin text-lg font-bold text-slate-900">اشتراكات منتهية</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>الكورس</th><th>نوع الاشتراك</th><th>انتهى في</th><th></th></tr></thead>
              <tbody>
                {expired.map(({ e, c }) => (
                  <tr key={e.id}>
                    <td className="font-bold text-slate-900">{c.title}</td>
                    <td><Badge tone="neutral">{SOURCE[e.source]?.label ?? e.source}</Badge></td>
                    <td className="text-xs text-slate-500">{formatDate(e.expiresAt)}</td>
                    <td><Link href={`/checkout/${c.slug}`} className="btn btn-primary btn-sm">تجديد الاشتراك</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
