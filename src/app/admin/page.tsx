import Link from "next/link";
import { and, count, desc, eq, gte, sql, sum } from "drizzle-orm";
import { Activity, AlertTriangle, ArrowLeft, Bot, BookOpen, CreditCard, Eye, GraduationCap, KeyRound, ListChecks, ShieldAlert, ShieldCheck, Ticket, TrendingUp, Users, Wallet } from "lucide-react";
import { db } from "@/db";
import { activationCodes, auditLogs, courses, enrollments, lessonProgress, lessons, paymentRequests, quizAttempts, sessions, users } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { aiConfigured } from "@/lib/payments";
import { isGoogleConfigured } from "@/lib/google";
import { BarChart } from "@/components/dashboard/charts";
import { Badge, PageHeader, StatCard } from "@/components/ui";
import { cn, formatMoney, gradeLabel, timeAgo } from "@/lib/utils";

const ACTION_LABEL: Record<string, string> = {
  "login.success": "تسجيل دخول", "login.failed": "دخول فاشل", "login.rate_limited": "حظر محاولات", "login.google": "دخول Google",
  "user.registered": "تسجيل حساب", "user.registered_google": "تسجيل عبر Google", "code.redeemed": "تفعيل كود", "code.failed": "كود خاطئ",
  "course.enrolled_free": "تفعيل كورس مجاني", "payment.requested": "طلب دفع", "payment.auto_approved": "تفعيل آلي (AI)", "quiz.started": "بدء امتحان",
  "quiz.submitted": "تسليم امتحان", "quiz.cancelled": "إلغاء امتحان (غش)", "admin.payment_approve": "تأكيد دفع", "admin.payment_reject": "رفض دفع",
};

function dayKey(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(d);
}

export default async function AdminHome() {
  await requireStaff();
  const s = await getSettings();
  const d7 = new Date(Date.now() - 7 * 86_400_000);
  const d14 = new Date(Date.now() - 14 * 86_400_000);
  const d30 = new Date(Date.now() - 30 * 86_400_000);
  const d1 = new Date(Date.now() - 86_400_000);

  const [
    [students], [newStudents], [activeNow], [publishedCourses], [enroll7], [rev30], [revAll], [pendingAgg], [attempts7], [cancelled7], [codesUnused], [codesUsed],
    revDaily, signupDaily, recentPayments, recentAudit, topCourses, recentStudents, [failedLogins7], watchedCourses,
  ] = await Promise.all([
    db.select({ c: count() }).from(users).where(eq(users.role, "student")),
    db.select({ c: count() }).from(users).where(and(eq(users.role, "student"), gte(users.createdAt, d7))),
    db.select({ c: sql<number>`count(distinct ${sessions.userId})` }).from(sessions).where(gte(sessions.lastSeenAt, d1)),
    db.select({ c: count() }).from(courses).where(eq(courses.isPublished, true)),
    db.select({ c: count() }).from(enrollments).where(gte(enrollments.createdAt, d7)),
    db.select({ s: sum(paymentRequests.amount) }).from(paymentRequests).where(and(eq(paymentRequests.status, "approved"), gte(paymentRequests.reviewedAt, d30))),
    db.select({ s: sum(paymentRequests.amount) }).from(paymentRequests).where(eq(paymentRequests.status, "approved")),
    db.select({ c: count(), s: sum(paymentRequests.amount) }).from(paymentRequests).where(eq(paymentRequests.status, "pending")),
    db.select({ c: count(), avg: sql<number>`coalesce(avg(${quizAttempts.percent}),0)` }).from(quizAttempts).where(and(eq(quizAttempts.status, "submitted"), gte(quizAttempts.startedAt, d7))),
    db.select({ c: count() }).from(quizAttempts).where(and(eq(quizAttempts.status, "cancelled"), gte(quizAttempts.startedAt, d7))),
    db.select({ c: count() }).from(activationCodes).where(eq(activationCodes.isUsed, false)),
    db.select({ c: count() }).from(activationCodes).where(eq(activationCodes.isUsed, true)),
    db.select({ day: sql<string>`to_char(${paymentRequests.reviewedAt} at time zone 'Africa/Cairo','YYYY-MM-DD')`, s: sql<number>`sum(${paymentRequests.amount})` }).from(paymentRequests).where(and(eq(paymentRequests.status, "approved"), gte(paymentRequests.reviewedAt, d14))).groupBy(sql`1`),
    db.select({ day: sql<string>`to_char(${users.createdAt} at time zone 'Africa/Cairo','YYYY-MM-DD')`, c: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "student"), gte(users.createdAt, d14))).groupBy(sql`1`),
    db.select({ p: paymentRequests, name: users.name, courseTitle: courses.title }).from(paymentRequests).innerJoin(users, eq(users.id, paymentRequests.userId)).leftJoin(courses, eq(courses.id, paymentRequests.courseId)).where(eq(paymentRequests.status, "pending")).orderBy(desc(paymentRequests.createdAt)).limit(6),
    db.select({ log: auditLogs, name: users.name }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.userId)).orderBy(desc(auditLogs.createdAt)).limit(10),
    db.select({ id: courses.id, title: courses.title, c: count(enrollments.id) }).from(courses).leftJoin(enrollments, eq(enrollments.courseId, courses.id)).groupBy(courses.id).orderBy(desc(count(enrollments.id))).limit(5),
    db.select({ id: users.id, name: users.name, grade: users.grade, createdAt: users.createdAt }).from(users).where(eq(users.role, "student")).orderBy(desc(users.createdAt)).limit(6),
    db.select({ c: count() }).from(auditLogs).where(and(gte(auditLogs.createdAt, d7), sql`${auditLogs.action} in ('login.failed','login.rate_limited','code.failed','code.rate_limited')`)),
    db.select({ id: courses.id, title: courses.title, c: count(lessonProgress.id) }).from(courses).leftJoin(lessons, eq(lessons.courseId, courses.id)).leftJoin(lessonProgress, eq(lessonProgress.lessonId, lessons.id)).groupBy(courses.id).orderBy(desc(count(lessonProgress.id))).limit(5),
  ]);

  const revMap = new Map(revDaily.map((r) => [r.day, Number(r.s)]));
  const signMap = new Map(signupDaily.map((r) => [r.day, Number(r.c)]));
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86_400_000);
    const key = dayKey(d);
    const label = new Intl.DateTimeFormat("ar-EG", { day: "numeric", timeZone: "Africa/Cairo" }).format(d);
    return { key, label };
  });
  const revenueSeries = last14.map((d) => ({ label: d.label, value: revMap.get(d.key) ?? 0, hint: d.key }));
  const signupSeries = last14.map((d) => ({ label: d.label, value: signMap.get(d.key) ?? 0, hint: d.key }));
  const checks = [
    { ok: Boolean(s.vodafone_cash_number), label: "رقم فودافون كاش للاستلام", href: "/admin/settings" },
    { ok: aiConfigured(s), label: "التحقق الآلي من الإيصالات (AI)", href: "/admin/ai" },
    { ok: isGoogleConfigured(), label: "تسجيل الدخول عبر Google", href: "/admin/setup" },
    { ok: Boolean(process.env.NEXT_PUBLIC_APP_URL), label: "رابط الموقع NEXT_PUBLIC_APP_URL", href: "/admin/setup" },
    { ok: Number(publishedCourses.c) > 0, label: "كورسات منشورة", href: "/admin/courses" },
  ];
  const suspicious = Number(failedLogins7.c ?? 0) + Number(cancelled7.c);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="نظرة عامة" title="لوحة التحكم" subtitle={`آخر تحديث ${new Intl.DateTimeFormat("ar-EG", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date())}`} actions={<Link href="/admin/payments" className="btn btn-primary">مراجعة المدفوعات <ArrowLeft className="size-4" /></Link>} />

      {/* ─── Simple step-by-step workflow – built for any teacher, no tech skills needed ─── */}
      <section className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-amin text-base font-bold text-slate-900"><ListChecks className="size-5 text-brand-500" /> ابدأ من هنا – خطوة بخطوة</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { n: 1, href: "/admin/settings", t: "اضبط بيانات المنصة", d: "أرقام التواصل، طرق الدفع، واسم المدرّس" },
            { n: 2, href: "/admin/courses", t: "ابنِ المنهج", d: "كورس ← فصول ← دروس، بالسحب والإاسقاط وجلب يوتيوب تلقائيًا" },
            { n: 3, href: "/admin/exams", t: "أنشئ الامتحانات", d: "لصق JSON من ChatGPT/Gemini – تصحيح تلقائي فوري" },
            { n: 4, href: "/admin/students", t: "تابع طلابك ومبيعاتك", d: "الطلاب، طلبات الدفع، وأكواد السنتر" },
          ].map((s) => (
            <Link key={s.n} href={s.href} className="group flex items-start gap-3 rounded-2xl border border-lav-200 bg-lav-50/60 p-4 transition hover:border-brand-400 hover:bg-white">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-amin text-sm font-bold text-white">{s.n}</span>
              <span>
                <span className="block text-sm font-black text-slate-900 group-hover:text-brand-700">{s.t}</span>
                <span className="mt-0.5 block text-[11px] leading-5 text-slate-500">{s.d}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="إجمالي عدد الطلاب" value={Number(students.c)} icon={<Users className="size-5" />} hint={`+${Number(newStudents.c)} هذا الأسبوع • ${Number(activeNow.c)} نشط خلال 24 ساعة`} />
        <StatCard label="المبيعات (30 يوم)" value={formatMoney(Number(rev30.s ?? 0))} icon={<TrendingUp className="size-5" />} tone="success" hint={`إجمالي المبيعات ${formatMoney(Number(revAll.s ?? 0))}`} />
        <StatCard label="تفعيلات الأكواد" value={Number(codesUsed.c)} icon={<Ticket className="size-5" />} tone="violet" hint={`${Number(codesUnused.c)} كود متاح للتفعيل`} />
        <StatCard label="طلبات دفع معلّقة" value={Number(pendingAgg.c)} icon={<CreditCard className="size-5" />} tone="accent" hint={`بقيمة ${formatMoney(Number(pendingAgg.s ?? 0))}`} />
        <StatCard label="اشتراكات هذا الأسبوع" value={Number(enroll7.c)} icon={<GraduationCap className="size-5" />} tone="violet" hint={`${Number(publishedCourses.c)} كورس منشور`} />
        <StatCard label="إجمالي المبيعات" value={formatMoney(Number(revAll.s ?? 0))} icon={<Wallet className="size-5" />} tone="success" hint="كل المدفوعات المؤكدة" />
      </div>

      {suspicious > 10 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="flex items-center gap-2"><ShieldAlert className="size-4" /> رُصد {Number(failedLogins7.c ?? 0)} محاولة دخول/أكواد مشبوهة و{Number(cancelled7.c)} امتحان ملغي بسبب الغش خلال 7 أيام.</span>
          <Link href="/admin/audit" className="btn btn-outline btn-sm">سجل الأمان</Link>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="card p-5 xl:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-amin text-base font-bold text-slate-900"><Wallet className="size-4 text-brand-500" /> الإيرادات المؤكدة – آخر 14 يومًا</h2>
            <span className="text-xs text-slate-500">بالجنيه</span>
          </div>
          <BarChart data={revenueSeries} height={150} color="from-brand-600 to-brand-300" valueSuffix=" ج" />
          <div className="mt-6 mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-amin text-base font-bold text-slate-900"><Users className="size-4 text-peach-500" /> تسجيلات الطلاب الجدد</h2>
          </div>
          <BarChart data={signupSeries} height={110} color="from-peach-500 to-peach-200" />
        </section>

        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-amin text-base font-bold text-slate-900"><Activity className="size-4 text-brand-500" /> الامتحانات (7 أيام)</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-lav-50 p-3 text-center"><p className="font-amin text-2xl font-bold text-slate-900">{Number(attempts7.c)}</p><p className="text-[11px] text-slate-500">محاولة مُسلّمة</p></div>
            <div className="rounded-xl bg-lav-50 p-3 text-center"><p className="font-amin text-2xl font-bold text-slate-900">{Math.round(Number(attempts7.avg))}%</p><p className="text-[11px] text-slate-500">متوسط الدرجات</p></div>
            <div className="rounded-xl bg-rose-50 p-3 text-center"><p className="font-amin text-2xl font-bold text-rose-700">{Number(cancelled7.c)}</p><p className="text-[11px] text-rose-600">ملغاة (غش/خروج)</p></div>
            <div className="rounded-xl bg-brand-50 p-3 text-center"><p className="font-amin text-2xl font-bold text-brand-700">{Number(codesUnused.c)}</p><p className="text-[11px] text-brand-700">كود سنتر متاح</p></div>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">تم استخدام {Number(codesUsed.c)} كود حتى الآن.</p>

          <h2 className="mb-3 mt-6 flex items-center gap-2 font-amin text-base font-bold text-slate-900"><ShieldCheck className="size-4 text-emerald-500" /> جاهزية النظام</h2>
          <ul className="space-y-1.5">
            {checks.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-lav-50">
                  <span className="text-slate-700">{c.label}</span>
                  <Badge tone={c.ok ? "success" : "warning"}>{c.ok ? "جاهز" : "ناقص"}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="card p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-amin text-base font-bold text-slate-900"><CreditCard className="size-4 text-peach-500" /> طلبات دفع بانتظار المراجعة</h2>
            <Link href="/admin/payments" className="text-xs font-bold text-brand-600 hover:underline">مراجعة الكل</Link>
          </div>
          {recentPayments.length === 0 ? (
            <p className="rounded-xl bg-lav-50 p-6 text-center text-sm text-slate-500">لا توجد طلبات معلّقة 🎉</p>
          ) : (
            <ul className="divide-y divide-lav-200">
              {recentPayments.map(({ p, name, courseTitle }) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">{name} <span className="font-normal text-slate-500">• {courseTitle ?? "—"}</span></p>
                    <p className="text-[11px] text-slate-500">{timeAgo(p.createdAt)} • مرجع <span className="font-mono" dir="ltr">{p.reference}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.aiScore != null ? <Badge tone={p.aiScore >= 85 ? "success" : p.aiScore >= 50 ? "warning" : "danger"}><Bot className="size-3" /> {p.aiScore}%</Badge> : <Badge tone="neutral">بدون تحقق آلي</Badge>}
                    <span className="font-amin font-bold text-brand-700">{formatMoney(p.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-amin text-base font-bold text-slate-900"><BookOpen className="size-4 text-brand-500" /> أكثر الكورسات اشتراكًا</h2>
          <ul className="space-y-2">
            {topCourses.map((c, i) => {
              const max = Number(topCourses[0]?.c ?? 1) || 1;
              return (
                <li key={c.id}>
                  <Link href={`/admin/courses/${c.id}`} className="block rounded-lg px-1 py-1 hover:bg-lav-50">
                    <div className="flex items-center justify-between text-xs"><span className="truncate font-bold text-slate-800">{i + 1}. {c.title}</span><span className="text-slate-500">{Number(c.c)}</span></div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-lav-200"><div className="h-full rounded-full bg-gradient-to-l from-brand-500 to-peach-400" style={{ width: `${(Number(c.c) / max) * 100}%` }} /></div>
                  </Link>
                </li>
              );
            })}
            {topCourses.length === 0 && <li className="text-sm text-slate-500">لا توجد كورسات بعد.</li>}
          </ul>

          <h2 className="mb-3 mt-6 flex items-center gap-2 font-amin text-base font-bold text-slate-900"><Eye className="size-4 text-peach-500" /> أكثر الكورسات مشاهدة</h2>
          <ul className="space-y-2">
            {watchedCourses.map((c, i) => {
              const max = Number(watchedCourses[0]?.c ?? 1) || 1;
              return (
                <li key={c.id}>
                  <Link href={`/admin/courses/${c.id}`} className="block rounded-lg px-1 py-1 hover:bg-lav-50">
                    <div className="flex items-center justify-between text-xs"><span className="truncate font-bold text-slate-800">{i + 1}. {c.title}</span><span className="text-slate-500">{Number(c.c)} مشاهدة</span></div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-lav-200"><div className="h-full rounded-full bg-gradient-to-l from-peach-500 to-brand-400" style={{ width: `${(Number(c.c) / max) * 100}%` }} /></div>
                  </Link>
                </li>
              );
            })}
            {watchedCourses.length === 0 && <li className="text-sm text-slate-500">لا توجد مشاهدات بعد.</li>}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-amin text-base font-bold text-slate-900"><Activity className="size-4 text-brand-500" /> آخر الأحداث</h2>
            <Link href="/admin/audit" className="text-xs font-bold text-brand-600 hover:underline">سجل الأمان</Link>
          </div>
          <ul className="divide-y divide-lav-200">
            {recentAudit.map(({ log, name }) => {
              const danger = /failed|rate_limited|cancelled|banned/.test(log.action);
              return (
                <li key={log.id} className="flex items-center justify-between gap-2 py-2 text-xs">
                  <span className="flex items-center gap-2 truncate">
                    <span className={cn("size-2 shrink-0 rounded-full", danger ? "bg-rose-500" : log.action.startsWith("admin.") ? "bg-peach-500" : "bg-brand-500")} />
                    <span className="truncate text-slate-700"><b>{ACTION_LABEL[log.action] ?? log.action}</b> {name ? `• ${name}` : ""}</span>
                  </span>
                  <span className="shrink-0 text-slate-400">{timeAgo(log.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-amin text-base font-bold text-slate-900"><Users className="size-4 text-brand-500" /> أحدث الطلاب</h2>
            <Link href="/admin/students" className="text-xs font-bold text-brand-600 hover:underline">الكل</Link>
          </div>
          <ul className="divide-y divide-lav-200">
            {recentStudents.map((u) => (
              <li key={u.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/admin/students/${u.id}`} className="font-bold text-slate-900 hover:text-brand-600">{u.name}</Link>
                <span className="flex items-center gap-2 text-xs text-slate-500"><Badge tone="brand">{gradeLabel(u.grade)}</Badge> {timeAgo(u.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/admin/codes", t: "توليد أكواد سنتر", d: "كورس / وحدة / درس", i: Ticket },
          { href: "/admin/courses", t: "إضافة محتوى", d: "فيديو، PDF، امتحانات", i: BookOpen },
          { href: "/admin/exams", t: "جدولة امتحان", d: "مواعيد ومنع غش", i: KeyRound },
          { href: "/admin/ai", t: "التحقق الآلي", d: "Gemini / OpenAI", i: Bot },
        ].map((q) => (
          <Link key={q.href} href={q.href} className="card card-hover flex items-center gap-3 p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><q.i className="size-5" /></span>
            <span><span className="block text-sm font-black text-slate-900">{q.t}</span><span className="block text-[11px] text-slate-500">{q.d}</span></span>
          </Link>
        ))}
      </section>
      <p className="flex items-center gap-1.5 text-[11px] text-slate-400"><AlertTriangle className="size-3.5" /> كل الإجراءات الإدارية مسجلة في سجل الأمان مع عنوان IP.</p>
    </div>
  );
}
