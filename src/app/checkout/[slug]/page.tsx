import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowRight, BadgeCheck, Clock3, Copy, Lock, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { db } from "@/db";
import { paymentRequests } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { hasCourseAccess } from "@/lib/access";
import { getCourseBySlug } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { CopyButton } from "@/components/ui-client";
import { Logo } from "@/components/site/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui";
import { formatDate, formatMoney, gradeLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "إتمام الشراء" };

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course || !course.isPublished) notFound();
  const user = await requireUser(`/checkout/${slug}`);
  if (await hasCourseAccess(user.id, course.id)) redirect(`/courses/${course.slug}?already=1`);

  // Server is the single source of truth for the price
  const price = course.isFree ? 0 : (course.discountPrice ?? course.price);
  if (price <= 0) redirect(`/courses/${course.slug}`);

  const [s, [pending]] = await Promise.all([
    getSettings(),
    db.select().from(paymentRequests).where(and(eq(paymentRequests.userId, user.id), eq(paymentRequests.courseId, course.id), eq(paymentRequests.status, "pending"))).limit(1),
  ]);
  const hasDiscount = !course.isFree && course.discountPrice !== null && course.discountPrice < course.price;

  return (
    <div className="min-h-screen bg-lav-50 dark:bg-[var(--color-surface-0)]">
      <header className="border-b border-lav-200 bg-white/90 backdrop-blur dark:bg-[var(--color-surface)]">
        <div className="container-x flex h-16 items-center justify-between">
          <Logo siteName={s.site_name} teacherName={s.teacher_name} logoUrl={s.site_logo || undefined} />
          <div className="flex items-center gap-2">
            <ThemeToggle size="sm" />
            <Link href={`/courses/${course.slug}`} className="btn btn-ghost btn-sm"><ArrowRight className="size-4" /> رجوع</Link>
          </div>
        </div>
      </header>

      <main className="container-x py-8">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
          <span className="flex items-center gap-1 text-brand-600"><Lock className="size-3.5" /> دفع آمن</span> • <span>فودافون كاش</span> • <span>تفعيل خلال ساعات أو فوري بالتحقق الآلي</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* order summary */}
          <aside className="space-y-4 lg:col-span-2">
            <div className="card overflow-hidden">
              {course.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.coverImage} alt={course.title} className="aspect-video w-full object-cover" />
              ) : (
                <div className="aspect-video w-full bg-gradient-to-br from-brand-400 to-brand-700" />
              )}
              <div className="p-5">
                <Badge tone="brand">{gradeLabel(course.grade)}</Badge>
                <h1 className="mt-2 font-amin text-lg font-bold text-slate-900">{course.title}</h1>
                <div className="mt-4 space-y-2 border-t border-lav-200 pt-4 text-sm">
                  <div className="flex justify-between text-slate-600"><span>سعر الكورس</span><span>{formatMoney(course.price)}</span></div>
                  {hasDiscount && <div className="flex justify-between text-emerald-600"><span>الخصم</span><span>- {formatMoney(course.price - price)}</span></div>}
                  <div className="flex justify-between border-t border-lav-200 pt-2 font-amin text-lg font-bold text-slate-900"><span>الإجمالي المطلوب تحويله</span><span className="text-brand-700">{formatMoney(price)}</span></div>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">مدة الوصول: {course.accessDays ? `${course.accessDays} يوم` : "غير محدودة"}</p>
              </div>
            </div>
            <ul className="card space-y-2 p-4 text-xs text-slate-600">
              <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-500" /> السعر محدد من الخادم ولا يمكن التلاعب به</li>
              <li className="flex items-center gap-2"><BadgeCheck className="size-4 text-emerald-500" /> يتم التحقق من الإيصال يدويًا وبالذكاء الاصطناعي</li>
              <li className="flex items-center gap-2"><Clock3 className="size-4 text-emerald-500" /> تصلك إشعارًا فور تفعيل الكورس</li>
            </ul>
          </aside>

          {/* payment steps */}
          <section className="space-y-4 lg:col-span-3">
            {pending ? (
              <div className="card p-6 text-center">
                <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-amber-50 text-amber-600"><Clock3 className="size-8" /></span>
                <h2 className="mt-4 font-amin text-xl font-bold text-slate-900">طلبك قيد المراجعة</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">أرسلت طلب دفع لهذا الكورس بتاريخ {formatDate(pending.createdAt, true)} بمرجع <span className="font-mono" dir="ltr">{pending.reference}</span>. سيتم تفعيل الكورس فور تأكيد التحويل.</p>
                <Link href="/dashboard/purchases" className="btn btn-primary mt-5">متابعة حالة الطلب</Link>
              </div>
            ) : (
              <>
                <div className="card p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600"><Smartphone className="size-5" /></span>
                    <div>
                      <h2 className="font-amin text-lg font-bold text-slate-900">الخطوة 1: حوّل المبلغ عبر فودافون كاش</h2>
                      <p className="text-xs text-slate-500">طريقة الدفع المفعّلة حاليًا</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-500">حوّل <span className="text-brand-700">{formatMoney(price)}</span> بالضبط إلى رقم</p>
                      <p className="mt-1 break-anywhere font-mono text-xl font-black tracking-wider text-slate-900 sm:text-2xl" dir="ltr">{s.vodafone_cash_number}</p>
                      <p className="mt-1 text-[11px] text-slate-500">باسم {s.teacher_name}</p>
                    </div>
                    <CopyButton text={s.vodafone_cash_number} label="نسخ الرقم" className="shrink-0" />
                  </div>
                  <p className="mt-3 font-taj text-xs leading-6 text-slate-500">{s.checkout_instructions}</p>
                  <ol className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                    <li className="rounded-xl bg-lav-50 p-3"><b className="block text-slate-900">1. اطلب</b> <span dir="ltr">*9#</span> أو افتح تطبيق أنا فودافون</li>
                    <li className="rounded-xl bg-lav-50 p-3"><b className="block text-slate-900">2. حوّل</b> المبلغ لرقم المستر أعلاه</li>
                    <li className="rounded-xl bg-lav-50 p-3"><b className="block text-slate-900">3. احتفظ</b> برسالة التأكيد ورقم العملية</li>
                  </ol>
                </div>

                <div className="card p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><Wallet className="size-5" /></span>
                    <div>
                      <h2 className="font-amin text-lg font-bold text-slate-900">الخطوة 2: أكّد التحويل وارفع الإيصال</h2>
                      <p className="text-xs text-slate-500">نتحقق من المبلغ ورقم العملية وصورة الإيصال</p>
                    </div>
                  </div>
                  <CheckoutForm courseId={course.id} defaultPhone={user.phone} />
                </div>
              </>
            )}
            {s.whatsapp && <p className="flex items-center justify-center gap-1 text-[11px] text-slate-400"><Copy className="size-3" /> لو واجهتك مشكلة تواصل معنا على واتساب <a href={`https://wa.me/${s.whatsapp}`} className="font-bold text-brand-600" target="_blank" rel="noopener noreferrer">من هنا</a></p>}
          </section>
        </div>
      </main>
    </div>
  );
}
