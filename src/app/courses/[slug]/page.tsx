import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, FileText, Lock, PlayCircle, ClipboardCheck, Unlock, BookOpen, Infinity as InfinityIcon } from "lucide-react";
import { SiteShell } from "@/components/site/shell";
import { Badge } from "@/components/ui";
import { EnrollButton } from "@/components/enroll-button";
import { getCourseBySlug, getCurriculum } from "@/lib/data";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { canOpenLesson, getAccessState } from "@/lib/access";
import { getEnrollmentInfo, getPendingPaymentFor } from "@/lib/enrollment";
import { getSettings } from "@/lib/settings";
import { GRADES, formatDate, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  return { title: course?.title ?? "الكورس", description: course?.description };
}

const typeIcon = { video: PlayCircle, pdf: FileText, quiz: ClipboardCheck } as const;

export default async function CoursePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const course = await getCourseBySlug(slug);
  const user = await getCurrentUser();
  if (!course || (!course.isPublished && !isStaff(user))) notFound();

  const [units, s, access, enrollmentInfo, pendingPayment] = await Promise.all([
    getCurriculum(course.id),
    getSettings(),
    getAccessState(user, course.id),
    user ? getEnrollmentInfo(user.id, course.id) : Promise.resolve(null),
    user ? getPendingPaymentFor(user.id, course.id) : Promise.resolve(null),
  ]);
  const enrolled = access.full;
  const lessonsCount = units.reduce((a, u) => a + u.lessons.length, 0);
  const minutes = units.reduce((a, u) => a + u.lessons.reduce((b, l) => b + l.durationMinutes, 0), 0);
  const quizCount = units.reduce((a, u) => a + u.lessons.filter((l) => l.type === "quiz").length, 0);
  const price = course.isFree ? 0 : (course.discountPrice ?? course.price);
  const hasDiscount = !course.isFree && course.discountPrice !== null && course.discountPrice < course.price;
  const g = GRADES[course.grade];

  return (
    <SiteShell>
      {sp.locked && <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-800">{sp.exam ? "لا يمكن دخول الامتحان قبل الاشتراك في هذا الكورس. اشترك الآن (أو فعّل كود السنتر الخاص بالدرس) ثم عُد للامتحان." : "هذا المحتوى متاح للمشتركين فقط. اشترك في الكورس أو فعّل كود السنتر من لوحة الطالب."}</div>}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200">
            {course.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={course.coverImage} alt={course.title} className="aspect-video w-full object-cover" />
            ) : (
              <div className={`aspect-video w-full bg-gradient-to-br ${g.color}`} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
            <div className="absolute bottom-0 p-6 sm:p-8">
              <div className="flex flex-wrap gap-2">
                <Badge tone="brand">{g.label}</Badge>
                {course.isFree && <Badge tone="success">مجاني</Badge>}
                {!course.isPublished && <Badge tone="warning">غير منشور (معاينة إدارية)</Badge>}
              </div>
              <h1 className="mt-3 text-2xl font-black leading-snug text-slate-900 sm:text-4xl">{course.title}</h1>
              <p className="mt-2 text-sm text-slate-700">بواسطة {s.teacher_name}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { i: PlayCircle, v: `${lessonsCount} درس`, l: "عدد الدروس" },
              { i: Clock, v: `${Math.max(1, Math.round(minutes / 60))} ساعة`, l: "مدة المحتوى" },
              { i: ClipboardCheck, v: `${quizCount} اختبار`, l: "اختبارات إلكترونية" },
              { i: course.accessDays ? Clock : InfinityIcon, v: course.accessDays ? `${course.accessDays} يوم` : "غير محدودة", l: "مدة الوصول" },
            ].map((x) => (
              <div key={x.l} className="card flex items-center gap-3 p-4">
                <x.i className="size-5 shrink-0 text-brand-400" />
                <span>
                  <span className="block text-sm font-black text-slate-900">{x.v}</span>
                  <span className="block text-[11px] text-slate-500">{x.l}</span>
                </span>
              </div>
            ))}
          </div>

          <section className="card mt-6 p-6">
            <h2 className="text-lg font-black text-slate-900">عن الكورس</h2>
            <p className="prose-ar mt-3 whitespace-pre-line">{course.description || "لا يوجد وصف بعد."}</p>
          </section>

          <section className="mt-6">
            <h2 className="mb-4 text-lg font-black text-slate-900">محتوى الكورس</h2>
            <div className="space-y-3">
              {units.length === 0 && <p className="card p-6 text-sm text-slate-500">سيتم إضافة الدروس قريبًا.</p>}
              {units.map((u, ui) => (
                <details key={u.id} className="card group" open={ui === 0}>
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4">
                    <span className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-xl bg-brand-400/10 text-sm font-black text-brand-600">{ui + 1}</span>
                      <span>
                        <span className="block text-sm font-black text-slate-900">{u.title}</span>
                        <span className="block text-xs text-slate-500">{u.lessons.length} درس</span>
                      </span>
                    </span>
                    <span className="text-slate-500 transition group-open:rotate-180">▾</span>
                  </summary>
                  <ul className="border-t border-slate-200">
                    {u.lessons.map((l) => {
                      const Icon = typeIcon[l.type];
                      const open = canOpenLesson(access, l);
                      const row = (
                        <div className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                          <span className="flex items-center gap-3">
                            <Icon className="size-4 text-brand-400" />
                            <span className={open ? "text-slate-900" : "text-slate-500"}>{l.title}</span>
                            {l.isFreePreview && !enrolled && <Badge tone="success">مجاني</Badge>}
                          </span>
                          <span className="flex items-center gap-3 text-xs text-slate-500">
                            {l.durationMinutes > 0 && <span>{l.durationMinutes} د</span>}
                            {open ? <Unlock className="size-4 text-emerald-600" /> : <Lock className="size-4" />}
                          </span>
                        </div>
                      );
                      return (
                        <li key={l.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-100">
                          {open ? <Link href={`/learn/${course.slug}/${l.id}`}>{row}</Link> : row}
                        </li>
                      );
                    })}
                  </ul>
                </details>
              ))}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            {sp.already && enrolled && (
              <div className="mb-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="flex items-center gap-2 font-black"><CheckCircle2 className="size-4" /> أنت مشترك في هذا الكورس بالفعل!</p>
                <p className="mt-1 text-xs leading-6">لا حاجة للدفع مرة أخرى – الاشتراك فعّال على حسابك ويمكنك متابعة الدروس والامتحانات مباشرة.</p>
              </div>
            )}
            {enrolled ? (
              <>
                <Badge tone="success" className="mb-3"><CheckCircle2 className="size-3" /> أنت مشترك في هذا الكورس</Badge>
                {enrollmentInfo && (
                  <ul className="mb-4 space-y-1 rounded-xl bg-emerald-50/60 p-3 text-xs text-slate-600">
                    <li>نوع الاشتراك: <b className="text-slate-900">{enrollmentInfo.sourceLabel}</b></li>
                    <li>تاريخ الاشتراك: <b className="text-slate-900">{formatDate(enrollmentInfo.createdAt)}</b></li>
                    <li>الصلاحية: <b className="text-slate-900">{enrollmentInfo.expiresAt ? `حتى ${formatDate(enrollmentInfo.expiresAt)} (${enrollmentInfo.daysLeft} يوم متبقٍ)` : "غير محدودة"}</b></li>
                  </ul>
                )}
                <Link href={`/learn/${course.slug}`} className="btn btn-primary w-full py-3 text-base"><BookOpen className="size-5" /> متابعة المذاكرة</Link>
                <Link href="/dashboard/subscriptions" className="btn btn-ghost mt-2 w-full text-xs">عرض كل اشتراكاتي</Link>
              </>
            ) : pendingPayment ? (
              <>
                <Badge tone="warning" className="mb-3"><Clock className="size-3" /> لديك طلب دفع قيد المراجعة لهذا الكورس</Badge>
                <p className="text-xs leading-6 text-slate-600">أرسلت طلب دفع بتاريخ {formatDate(pendingPayment.createdAt, true)} بمرجع <span className="font-mono" dir="ltr">{pendingPayment.reference ?? "—"}</span>. سيتم تفعيل الكورس تلقائيًا فور تأكيد المستر – لا ترسل طلبًا آخر.</p>
                <Link href="/dashboard/purchases" className="btn btn-accent mt-4 w-full py-3">متابعة حالة الطلب</Link>
              </>
            ) : (
              <>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-black text-sakr-600">{formatPrice(price)}</span>
                  {hasDiscount && <span className="mb-1 text-base text-slate-500 line-through">{formatPrice(course.price)}</span>}
                </div>
                {hasDiscount && <p className="mt-1 text-xs font-bold text-emerald-600">وفّر {formatPrice(course.price - price)} لفترة محدودة</p>}
                <div className="mt-5">
                  <EnrollButton courseId={course.id} price={price} loggedIn={Boolean(user)} slug={course.slug} />
                </div>
                {price > 0 && <p className="mt-3 text-center text-xs text-slate-500">الدفع عبر فودافون كاش مع رفع إيصال التحويل – يتم التفعيل بعد التحقق</p>}
                {user && access.lessonIds.size > 0 && <p className="mt-2 text-center text-xs font-bold text-peach-600">لديك وصول جزئي (كود سنتر) لـ {access.lessonIds.size} درس من هذا الكورس</p>}
                <p className="mt-3 text-center text-xs text-slate-500">طالب سنتر؟ فعّل كودك من <Link href="/dashboard/codes" className="text-brand-600 hover:underline">صفحة كود السنتر</Link></p>
              </>
            )}
            <ul className="mt-6 space-y-2.5 border-t border-slate-200 pt-5 text-sm text-slate-700">
              {["مشاهدة غير محدودة طوال فترة الاشتراك", "امتحان إلكتروني بعد كل وحدة", "ملخصات PDF قابلة للتحميل", "متابعة التقدم ونتائج الامتحانات", "دعم فني عبر واتساب"].map((t) => (
                <li key={t} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {t}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </SiteShell>
  );
}
