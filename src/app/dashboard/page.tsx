import Link from "next/link";
import { and, asc, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { ArrowLeft, Award, BookOpen, CalendarClock, CheckCircle2, ClipboardCheck, Clock3, Flame, KeyRound, Medal, PlayCircle, ShoppingBag, Sparkles, Star, Target, TrendingUp, Trophy, Zap } from "lucide-react";
import { db } from "@/db";
import { courses, lessonProgress, lessons, paymentRequests, quizAttempts, quizzes, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getAccessibleCourseIds, getCurriculum, getRecentNotifications, getUserCourses } from "@/lib/data";
import { BarChart, ProgressRing } from "@/components/dashboard/charts";
import { Badge } from "@/components/ui";
import { cn, formatDate, formatDuration, timeAgo } from "@/lib/utils";

function Kpi({ label, value, hint, icon: Icon, tone }: { label: string; value: string | number; hint?: string; icon: typeof BookOpen; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500">{label}</p>
          <p className="mt-2 font-amin text-2xl font-bold text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
        </div>
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", tone)}><Icon className="size-5" /></span>
      </div>
    </div>
  );
}

export default async function DashboardHome({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser("/dashboard");
  const now = new Date();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  const [myCourses, notifs, attempts, pending, lastProgress, weekly, access, completedAll] = await Promise.all([
    getUserCourses(user.id),
    getRecentNotifications(user.id, 4),
    db
      .select({ id: quizAttempts.id, percent: quizAttempts.percent, passed: quizAttempts.passed, submittedAt: quizAttempts.submittedAt, quizTitle: quizzes.title, quizId: quizzes.id })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
      .where(and(eq(quizAttempts.userId, user.id), eq(quizAttempts.status, "submitted")))
      .orderBy(desc(quizAttempts.submittedAt))
      .limit(50),
    db.select({ id: paymentRequests.id, title: courses.title }).from(paymentRequests).leftJoin(courses, eq(courses.id, paymentRequests.courseId)).where(and(eq(paymentRequests.userId, user.id), eq(paymentRequests.status, "pending"))).limit(3),
    db.select({ lessonId: lessonProgress.lessonId, courseId: lessonProgress.courseId }).from(lessonProgress).where(eq(lessonProgress.userId, user.id)).orderBy(desc(lessonProgress.completedAt)).limit(1),
    db.select({ day: sql<string>`to_char(${lessonProgress.completedAt} at time zone 'Africa/Cairo', 'YYYY-MM-DD')`, c: sql<number>`count(*)` }).from(lessonProgress).where(and(eq(lessonProgress.userId, user.id), gt(lessonProgress.completedAt, weekAgo))).groupBy(sql`1`),
    getAccessibleCourseIds(user.id),
    db.select({ c: sql<number>`count(*)`, minutes: sql<number>`coalesce(sum(${lessons.durationMinutes}),0)` }).from(lessonProgress).innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId)).where(eq(lessonProgress.userId, user.id)),
  ]);

  const courseIds = [...access.full, ...access.partial];
  const examRows = courseIds.length
    ? await db
        .select({ q: quizzes, courseTitle: courses.title })
        .from(quizzes)
        .innerJoin(courses, eq(courses.id, quizzes.courseId))
        .where(and(inArray(quizzes.courseId, courseIds), eq(quizzes.isPublished, true), or(isNull(quizzes.availableUntil), gt(quizzes.availableUntil, now))))
        .orderBy(asc(quizzes.availableFrom), asc(quizzes.createdAt))
        .limit(30)
    : [];
  const attemptedQuizIds = new Set(attempts.map((a) => a.quizId));
  const upcoming = examRows
    .filter((r) => {
      if (attemptedQuizIds.has(r.q.id)) return false;
      if (access.full.has(r.q.courseId)) return true;
      return r.q.lessonId ? Boolean(access.lessonIdsByCourse.get(r.q.courseId)?.has(r.q.lessonId)) : false;
    })
    .slice(0, 4);

  // Continue learning
  let resume: { title: string; courseTitle: string; href: string; progress: number; cover: string | null } | null = null;
  const target = lastProgress[0] ? myCourses.find((c) => c.id === lastProgress[0].courseId) : myCourses[0];
  if (target) {
    const units = await getCurriculum(target.id);
    const all = units.flatMap((u) => u.lessons).filter((l) => access.full.has(target.id) || l.isFreePreview || access.lessonIdsByCourse.get(target.id)?.has(l.id));
    const done = new Set((await db.select({ id: lessonProgress.lessonId }).from(lessonProgress).where(and(eq(lessonProgress.userId, user.id), eq(lessonProgress.courseId, target.id)))).map((r) => r.id));
    const next = all.find((l) => !done.has(l.id)) ?? all[0];
    if (next) resume = { title: next.title, courseTitle: target.title, href: `/learn/${target.slug}/${next.id}`, progress: target.progress ?? 0, cover: target.coverImage };
  }

  // Rank in grade
  let rank: { position: number; of: number; avg: number } | null = null;
  if (user.grade && attempts.length) {
    const rows = await db
      .select({ userId: quizAttempts.userId, avg: sql<number>`avg(${quizAttempts.percent})` })
      .from(quizAttempts)
      .innerJoin(users, eq(users.id, quizAttempts.userId))
      .where(and(eq(users.grade, user.grade), eq(quizAttempts.status, "submitted")))
      .groupBy(quizAttempts.userId);
    const sorted = rows.map((r) => ({ userId: r.userId, avg: Number(r.avg) })).sort((a, b) => b.avg - a.avg);
    const idx = sorted.findIndex((r) => r.userId === user.id);
    if (idx >= 0) rank = { position: idx + 1, of: sorted.length, avg: Math.round(sorted[idx].avg) };
  }

  const avg = attempts.length ? Math.round(attempts.reduce((a, b) => a + b.percent, 0) / attempts.length) : 0;
  const best = attempts.reduce((m, a) => Math.max(m, a.percent), 0);
  const completedLessons = Number(completedAll[0]?.c ?? 0);
  const minutes = Number(completedAll[0]?.minutes ?? 0);
  const totalLessons = myCourses.reduce((a, c) => a + (c.partial ? (access.lessonIdsByCourse.get(c.id)?.size ?? 0) : (c.lessonsCount ?? 0)), 0);
  const overall = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const byDay = new Map(weekly.map((w) => [w.day, Number(w.c)]));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000);
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(d);
    return { label: new Intl.DateTimeFormat("ar-EG", { weekday: "short", timeZone: "Africa/Cairo" }).format(d), value: byDay.get(key) ?? 0 };
  });
  const activeDays = days.filter((d) => d.value > 0).length;
  const achievements = [
    { icon: PlayCircle, title: "أول خطوة", unlocked: completedLessons >= 1 },
    { icon: Flame, title: "مثابر", unlocked: activeDays >= 3 },
    { icon: BookOpen, title: "قارئ نهم", unlocked: completedLessons >= 10 },
    { icon: ClipboardCheck, title: "أول امتحان", unlocked: attempts.length >= 1 },
    { icon: Star, title: "متفوق", unlocked: best >= 90 },
    { icon: Trophy, title: "بطل الكورس", unlocked: myCourses.some((c) => (c.progress ?? 0) >= 100) },
  ];
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Cairo" }).format(now));
  const greeting = hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء النور";

  return (
    <div className="space-y-6">
      {sp.welcome && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800">🎉 أهلًا بك في المنصة يا {user.name.split(" ")[0]}! ابدأ بتصفح الكورسات أو فعّل كود السنتر.</div>}
      {pending.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          <span className="flex items-center gap-2"><Clock3 className="size-4" /> لديك {pending.length} طلب دفع قيد مراجعة المستر ({pending.map((p) => p.title).filter(Boolean).join("، ")}).</span>
          <Link href="/dashboard/purchases" className="btn btn-accent btn-sm">متابعة الطلب</Link>
        </div>
      )}

      {/* header: greeting + continue learning */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:col-span-2">
          <div className="pointer-events-none absolute -left-16 -top-16 size-56 rounded-full bg-brand-100/60 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 right-10 size-40 rounded-full bg-peach-100/70 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold text-brand-600">{greeting} 👋</p>
              <h1 className="mt-1 font-amin text-2xl font-bold text-slate-900 sm:text-3xl">{user.name}</h1>
              <p className="mt-1 text-sm text-slate-500">{activeDays > 0 ? `نشاط في ${activeDays} أيام هذا الأسبوع – استمر!` : "ابدأ أول درس اليوم وحافظ على سلسلة نشاطك."}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-3 text-white shadow-glow"><ProgressRing value={overall} size={84} stroke={8} label="التقدم" /></div>
              <div className="text-xs text-slate-500">
                <p className="font-amin text-xl font-bold text-slate-900">{completedLessons} / {totalLessons}</p>
                <p>درس مكتمل</p>
                <p className="mt-1 font-bold text-brand-600">{formatDuration(minutes)} تعلّم</p>
              </div>
            </div>
          </div>

          <div className="relative mt-6 rounded-2xl border border-slate-200/80 bg-slate-50 p-4">
            {resume ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {resume.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resume.cover} alt="" className="h-16 w-28 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="h-16 w-28 shrink-0 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-brand-600">أكمل من حيث توقفت</p>
                  <p className="truncate font-amin text-base font-bold text-slate-900">{resume.title}</p>
                  <p className="truncate text-xs text-slate-500">{resume.courseTitle}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-l from-brand-500 to-peach-400" style={{ width: `${resume.progress}%` }} /></div>
                    <span className="text-[11px] font-bold text-slate-600">{resume.progress}%</span>
                  </div>
                </div>
                <Link href={resume.href} className="btn btn-primary shrink-0"><PlayCircle className="size-4" /> متابعة</Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">لم تبدأ أي كورس بعد. اشترك في كورس صفك أو فعّل كود السنتر لتبدأ المذاكرة.</p>
                <div className="flex gap-2">
                  <Link href="/courses" className="btn btn-primary btn-sm">تصفح الكورسات</Link>
                  <Link href="/dashboard/codes" className="btn btn-outline btn-sm"><KeyRound className="size-4" /> كود السنتر</Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* quick actions */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/dashboard/courses", t: "كورساتي", d: `${myCourses.length} كورس`, i: BookOpen, c: "bg-brand-50 text-brand-600" },
            { href: "/dashboard/exams", t: "الامتحانات", d: `${upcoming.length} متاح`, i: ClipboardCheck, c: "bg-violet-50 text-violet-600" },
            { href: "/dashboard/subscriptions", t: "اشتراكاتي", d: "الحالة والمدة", i: ShoppingBag, c: "bg-emerald-50 text-emerald-600" },
            { href: "/dashboard/codes", t: "كود السنتر", d: "فعّل كودك", i: KeyRound, c: "bg-peach-50 text-peach-600" },
          ].map((q) => (
            <Link key={q.href} href={q.href} className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-glow">
              <span className={cn("grid size-10 place-items-center rounded-xl", q.c)}><q.i className="size-5" /></span>
              <p className="mt-3 font-amin text-sm font-bold text-slate-900">{q.t}</p>
              <p className="text-[11px] text-slate-500">{q.d}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="كورساتي" value={myCourses.length} hint={`${myCourses.filter((c) => (c.progress ?? 0) >= 100).length} مكتمل`} icon={BookOpen} tone="bg-brand-50 text-brand-600" />
        <Kpi label="ساعات التعلم" value={formatDuration(minutes)} hint={`${completedLessons} درس`} icon={Clock3} tone="bg-peach-50 text-peach-600" />
        <Kpi label="متوسط الامتحانات" value={`${avg}%`} hint={attempts.length ? `أعلى درجة ${best}%` : "لا امتحانات بعد"} icon={Target} tone="bg-emerald-50 text-emerald-600" />
        <Kpi label="ترتيبك في صفك" value={rank ? `#${rank.position}` : "—"} hint={rank ? `من ${rank.of} طالب • متوسطك ${rank.avg}%` : "سلّم امتحانًا لتظهر في الترتيب"} icon={Medal} tone="bg-violet-50 text-violet-600" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* courses */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-amin text-base font-bold text-slate-900"><BookOpen className="size-4 text-brand-500" /> متابعة الكورسات</h2>
              <Link href="/dashboard/courses" className="text-xs font-bold text-brand-600 hover:underline">كل كورساتي</Link>
            </div>
            {myCourses.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">لا توجد كورسات بعد.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {myCourses.slice(0, 4).map((c) => (
                  <li key={c.id} className="flex items-center gap-4 py-3">
                    {c.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.coverImage} alt="" className="hidden h-14 w-24 shrink-0 rounded-xl object-cover sm:block" />
                    ) : (
                      <div className="hidden h-14 w-24 shrink-0 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 sm:block" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/learn/${c.slug}`} className="truncate text-sm font-bold text-slate-900 hover:text-brand-600">{c.title}</Link>
                        {c.partial && <Badge tone="accent">وصول جزئي</Badge>}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-l from-brand-500 to-peach-400" style={{ width: `${c.progress ?? 0}%` }} /></div>
                        <span className="w-10 text-end text-xs font-bold text-brand-700">{c.progress ?? 0}%</span>
                      </div>
                    </div>
                    <Link href={`/learn/${c.slug}`} className="btn btn-outline btn-sm shrink-0">متابعة</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* activity + recent exams */}
          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-amin text-base font-bold text-slate-900"><Zap className="size-4 text-peach-500" /> نشاط الأسبوع</h2>
                <span className="text-xs text-slate-500">{activeDays} أيام نشطة</span>
              </div>
              <BarChart data={days} height={120} color="from-brand-500 to-peach-300" valueSuffix=" درس" />
            </section>
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-amin text-base font-bold text-slate-900"><ClipboardCheck className="size-4 text-brand-500" /> آخر النتائج</h2>
                <Link href="/dashboard/exams?tab=results" className="text-xs font-bold text-brand-600 hover:underline">الكل</Link>
              </div>
              {attempts.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">لم تقم بأي امتحان بعد.</p>
              ) : (
                <ul className="space-y-2">
                  {attempts.slice(0, 4).map((a) => (
                    <li key={a.id}>
                      <Link href={`/quiz/${a.quizId}/result/${a.id}`} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50">
                        <span className="truncate font-bold text-slate-800">{a.quizTitle}</span>
                        <span className="flex items-center gap-2"><Badge tone={a.passed ? "success" : "danger"}>{a.percent}%</Badge><span className="text-[11px] text-slate-500">{formatDate(a.submittedAt)}</span></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* grades trend chart – average quiz grades over time */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-amin text-base font-bold text-slate-900"><TrendingUp className="size-4 text-emerald-500" /> متوسط درجات الامتحانات – آخر 8 محاولات</h2>
              <span className="text-xs text-slate-500">متوسطك الكلي {avg}%</span>
            </div>
            {attempts.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">سلّم أول امتحان لتظهر هنا منحنى تطور درجاتك.</p>
            ) : (
              <BarChart
                data={[...attempts].slice(0, 8).reverse().map((a) => ({ label: formatDate(a.submittedAt).split(" ")[0], value: a.percent, hint: a.quizTitle }))}
                height={130}
                color="from-emerald-500 to-emerald-200"
                valueSuffix="%"
              />
            )}
          </section>
        </div>

        <div className="space-y-6">
          {/* upcoming exams */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h2 className="mb-4 flex items-center gap-2 font-amin text-base font-bold text-slate-900"><CalendarClock className="size-4 text-peach-500" /> امتحانات متاحة وقادمة</h2>
            {upcoming.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">لا توجد امتحانات جديدة حاليًا.</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map(({ q, courseTitle }) => {
                  const notYet = q.availableFrom && q.availableFrom > now;
                  return (
                    <li key={q.id}>
                      <Link href={`/quiz/${q.id}`} className="block rounded-xl border border-slate-100 p-3 hover:border-brand-300 hover:bg-slate-50">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900">{q.title}</p>
                          <Badge tone={notYet ? "warning" : "success"}>{notYet ? "قادم" : "متاح الآن"}</Badge>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">{courseTitle}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{q.availableFrom ? `يفتح ${formatDate(q.availableFrom, true)}` : "بدون موعد محدد"} • {q.durationMinutes} دقيقة</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* latest notifications / announcements */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-amin text-base font-bold text-slate-900"><Sparkles className="size-4 text-brand-500" /> آخر التحديثات</h2>
              <Link href="/dashboard/notifications" className="text-xs font-bold text-brand-600 hover:underline">الكل</Link>
            </div>
            <ul className="space-y-2">
              {notifs.length === 0 && <li className="text-sm text-slate-500">لا توجد تحديثات بعد.</li>}
              {notifs.map((n) => (
                <li key={n.id} className={cn("rounded-xl border p-3", n.isRead ? "border-slate-100" : "border-brand-200 bg-brand-50/40")}>
                  <p className="text-sm font-bold text-slate-900">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">{n.body}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* achievements */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h2 className="mb-4 flex items-center gap-2 font-amin text-base font-bold text-slate-900"><Award className="size-4 text-peach-500" /> إنجازاتك</h2>
            <div className="grid grid-cols-3 gap-2">
              {achievements.map((a) => (
                <div key={a.title} className={cn("flex flex-col items-center rounded-xl border p-2 text-center", a.unlocked ? "border-peach-200 bg-peach-50" : "border-slate-100 bg-slate-50 opacity-50 grayscale")}>
                  <span className={cn("grid size-9 place-items-center rounded-full", a.unlocked ? "bg-gradient-to-br from-peach-400 to-brand-500 text-white" : "bg-slate-200 text-slate-400")}><a.icon className="size-4" /></span>
                  <p className="mt-1.5 text-[11px] font-bold text-slate-800">{a.title}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="flex items-center gap-2 text-[11px] text-slate-400"><CheckCircle2 className="size-3.5 text-emerald-500" /> يتم تحديث التقدم تلقائيًا عند إنهاء كل درس <ArrowLeft className="size-3" /></div>
        </div>
      </div>
    </div>
  );
}
