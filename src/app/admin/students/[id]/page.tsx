import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { ArrowRight, Ban, KeyRound, LogOut, ShieldCheck, Trash2, Unlock, UserCog } from "lucide-react";
import { db } from "@/db";
import { courses, enrollments, lessonAccess, lessons, paymentRequests, quizAttempts, quizzes, sessions, users } from "@/db/schema";
import { isSuperAdmin, requireStaff, roleLabel } from "@/lib/auth";
import {
  deleteStudentAction,
  enrollStudentAction,
  logoutUserEverywhereAction,
  setRoleAction,
  toggleActiveAction,
  toggleBanAction,
  unenrollStudentAction,
  unlockAccountAction,
} from "@/actions/admin";
import { ResetPasswordForm } from "@/components/admin/forms";
import { ConfirmForm } from "@/components/ui-client";
import { Avatar, Badge, PageHeader, Select, StatCard } from "@/components/ui";
import { formatDate, formatMoney, gradeLabel, timeAgo } from "@/lib/utils";

export default async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!u) notFound();

  const [enr, allCourses, attempts, payments, sess, partial] = await Promise.all([
    db.select({ e: enrollments, title: courses.title, slug: courses.slug }).from(enrollments).innerJoin(courses, eq(courses.id, enrollments.courseId)).where(eq(enrollments.userId, id)).orderBy(desc(enrollments.createdAt)),
    db.select({ id: courses.id, title: courses.title }).from(courses).orderBy(courses.title),
    db.select({ a: quizAttempts, title: quizzes.title }).from(quizAttempts).innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId)).where(and(eq(quizAttempts.userId, id), isNotNull(quizAttempts.submittedAt))).orderBy(desc(quizAttempts.submittedAt)).limit(20),
    db.select({ p: paymentRequests, title: courses.title }).from(paymentRequests).leftJoin(courses, eq(courses.id, paymentRequests.courseId)).where(eq(paymentRequests.userId, id)).orderBy(desc(paymentRequests.createdAt)).limit(20),
    db.select().from(sessions).where(eq(sessions.userId, id)).orderBy(desc(sessions.lastSeenAt)),
    db.select({ la: lessonAccess, lessonTitle: lessons.title, courseTitle: courses.title }).from(lessonAccess).innerJoin(lessons, eq(lessons.id, lessonAccess.lessonId)).innerJoin(courses, eq(courses.id, lessonAccess.courseId)).where(eq(lessonAccess.userId, id)).orderBy(desc(lessonAccess.createdAt)).limit(100),
  ]);
  const isAdminUser = isSuperAdmin(staff);
  const locked = u.lockedUntil && u.lockedUntil > new Date();
  const enrolledIds = new Set(enr.map((e) => e.e.courseId));

  return (
    <div className="space-y-6">
      <Link href="/admin/students" className="btn btn-ghost btn-sm"><ArrowRight className="size-4" /> كل الطلاب</Link>
      <div className="card flex flex-wrap items-center gap-4 p-6">
        <Avatar name={u.name} src={u.avatarUrl} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-black text-slate-900">{u.name}</h1>
          <p className="text-xs text-slate-500" dir="ltr">{u.email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone="brand">{gradeLabel(u.grade)}</Badge>
            <Badge tone={u.role === "student" ? "neutral" : "success"}>{roleLabel(u.role)}</Badge>
            {u.isBanned && <Badge tone="danger">محظور{u.banReason ? `: ${u.banReason}` : ""}</Badge>}
            {!u.isActive && <Badge tone="warning">موقوف</Badge>}
            {locked && <Badge tone="warning">مقفول حتى {formatDate(u.lockedUntil, true)}</Badge>}
            {u.googleId && <Badge tone="violet">Google</Badge>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-slate-500">
          <span>هاتف الطالب: <b className="text-slate-900" dir="ltr">{u.phone ?? "—"}</b></span>
          <span>ولي الأمر: <b className="text-slate-900" dir="ltr">{u.parentPhone ?? "—"}</b></span>
          <span>المحافظة: <b className="text-slate-900">{u.governorate ?? "—"}</b></span>
          <span>آخر دخول: <b className="text-slate-900">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "—"}</b></span>
          <span>IP: <b className="text-slate-900" dir="ltr">{u.lastLoginIp ?? "—"}</b></span>
          <span>مسجل منذ: <b className="text-slate-900">{formatDate(u.createdAt)}</b></span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="رصيد المحفظة" value={formatMoney(u.walletBalance)} tone="accent" />
        <StatCard label="الكورسات المشترك بها" value={enr.length} />
        <StatCard label="الامتحانات المسلّمة" value={attempts.length} tone="violet" />
      </div>

      <section className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-black text-slate-900"><UserCog className="size-5 text-emerald-600" /> إجراءات الحساب</h2>
        <div className="flex flex-wrap gap-2">
          <ConfirmForm action={toggleBanAction} message={u.isBanned ? "إلغاء حظر هذا الحساب؟" : "حظر هذا الحساب وفصل كل جلساته؟"}>
            <input type="hidden" name="userId" value={u.id} />
            <button className={u.isBanned ? "btn btn-success btn-sm" : "btn btn-danger btn-sm"}><Ban className="size-3.5" /> {u.isBanned ? "إلغاء الحظر" : "حظر الحساب"}</button>
          </ConfirmForm>
          <ConfirmForm action={toggleActiveAction} message={u.isActive ? "إيقاف هذا الحساب مؤقتًا؟" : "تفعيل الحساب؟"}>
            <input type="hidden" name="userId" value={u.id} />
            <button className="btn btn-outline btn-sm">{u.isActive ? "إيقاف مؤقت" : "تفعيل الحساب"}</button>
          </ConfirmForm>
          {locked && (
            <form action={unlockAccountAction}><input type="hidden" name="userId" value={u.id} /><button className="btn btn-outline btn-sm"><Unlock className="size-3.5" /> فك القفل المؤقت</button></form>
          )}
          <ConfirmForm action={logoutUserEverywhereAction} message="تسجيل خروج الطالب من كل الأجهزة؟">
            <input type="hidden" name="userId" value={u.id} />
            <button className="btn btn-outline btn-sm"><LogOut className="size-3.5" /> فصل كل الأجهزة ({sess.length})</button>
          </ConfirmForm>
          {(isAdminUser || u.role === "student") && u.id !== staff.id && u.role !== "super_admin" && u.role !== "admin" && (
            <ConfirmForm action={deleteStudentAction} message="حذف الحساب نهائيًا مع كل بياناته؟ لا يمكن التراجع!">
              <input type="hidden" name="userId" value={u.id} />
              <button className="btn btn-danger btn-sm"><Trash2 className="size-3.5" /> حذف نهائي</button>
            </ConfirmForm>
          )}
          {isAdminUser && u.id !== staff.id && (
            <>
              <form action={setRoleAction} className="flex items-center gap-2">
                <input type="hidden" name="userId" value={u.id} />
                <Select name="role" defaultValue={u.role === "admin" ? "super_admin" : u.role === "assistant" ? "teacher_admin" : u.role} className="py-1.5 text-xs">
                  <option value="student">طالب</option>
                  <option value="teacher_admin">مدرس / سكرتارية</option>
                  <option value="super_admin">مالك المنصة</option>
                </Select>
                <button className="btn btn-outline btn-sm"><ShieldCheck className="size-3.5" /> تغيير الدور</button>
              </form>
            </>
          )}
        </div>
      </section>

      {isAdminUser && (
        <section className="card p-6"><h2 className="mb-4 flex items-center gap-2 text-base font-black text-slate-900"><KeyRound className="size-4 text-amber-700" /> إعادة تعيين كلمة المرور</h2><ResetPasswordForm userId={u.id} /></section>
      )}

      <section className="card p-6">
        <h2 className="mb-4 text-base font-black text-slate-900">الكورسات</h2>
        <form action={enrollStudentAction} className="mb-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="userId" value={u.id} />
          <div className="min-w-60 flex-1">
            <Select name="courseId" required defaultValue="">
              <option value="" disabled>اختر كورس لتفعيله يدويًا</option>
              {allCourses.filter((c) => !enrolledIds.has(c.id)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </div>
          <button className="btn btn-primary btn-sm">تفعيل الكورس</button>
        </form>
        <ul className="divide-y divide-white/[0.06]">
          {enr.length === 0 && <li className="py-3 text-sm text-slate-500">لا توجد اشتراكات.</li>}
          {enr.map(({ e, title, slug }) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <span>
                <Link href={`/courses/${slug}`} className="font-bold text-slate-900 hover:text-brand-600">{title}</Link>
                <span className="block text-[11px] text-slate-500">المصدر: {e.source} • {formatMoney(e.pricePaid)} • {formatDate(e.createdAt)}{e.expiresAt ? ` • ينتهي ${formatDate(e.expiresAt)}` : ""}</span>
              </span>
              <ConfirmForm action={unenrollStudentAction} message="إلغاء اشتراك الطالب في هذا الكورس؟">
                <input type="hidden" name="userId" value={u.id} />
                <input type="hidden" name="courseId" value={e.courseId} />
                <button className="btn btn-danger btn-sm">إلغاء الاشتراك</button>
              </ConfirmForm>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-3 text-base font-black text-slate-900">نتائج الامتحانات</h2>
          <ul className="divide-y divide-white/[0.06] text-sm">
            {attempts.length === 0 && <li className="py-2 text-slate-500">لا توجد امتحانات.</li>}
            {attempts.map(({ a, title }) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <span className="text-slate-800">{title}</span>
                <span className="flex items-center gap-2"><Badge tone={a.passed ? "success" : "danger"}>{a.percent}%</Badge><span className="text-[11px] text-slate-500">{formatDate(a.submittedAt)}</span></span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-6">
          <h2 className="mb-3 text-base font-black text-slate-900">طلبات الدفع</h2>
          <ul className="divide-y divide-lav-200 text-sm">
            {payments.length === 0 && <li className="py-2 text-slate-500">لا توجد مدفوعات.</li>}
            {payments.map(({ p, title }) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span className="text-slate-800">{title ?? "شحن"}<span className="block text-[11px] text-slate-500">{formatDate(p.createdAt, true)} • مرجع <span dir="ltr">{p.reference ?? "—"}</span></span></span>
                <span className="flex items-center gap-2"><span className="font-bold">{formatMoney(p.amount)}</span>{p.status === "approved" ? <Badge tone="success">مؤكد</Badge> : p.status === "pending" ? <Badge tone="warning">معلّق</Badge> : <Badge tone="danger">مرفوض</Badge>}</span>
              </li>
            ))}
          </ul>
          {partial.length > 0 && (
            <>
              <h3 className="mb-2 mt-5 text-sm font-black text-slate-900">دروس مفتوحة بأكواد السنتر ({partial.length})</h3>
              <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
                {partial.map(({ la, lessonTitle, courseTitle }) => (
                  <li key={la.id} className="flex items-center justify-between rounded-lg bg-lav-50 px-2 py-1.5"><span className="truncate text-slate-800">{lessonTitle} <span className="text-slate-500">• {courseTitle}</span></span><span className="shrink-0 text-slate-500">{formatDate(la.createdAt)}</span></li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <section className="card p-6">
        <h2 className="mb-3 text-base font-black text-slate-900">الجلسات النشطة</h2>
        <ul className="divide-y divide-white/[0.06] text-sm">
          {sess.length === 0 && <li className="py-2 text-slate-500">لا توجد جلسات.</li>}
          {sess.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2">
              <span className="text-slate-800">{s.deviceLabel}<span className="block text-[11px] text-slate-500" dir="ltr">{s.ip} • {s.userAgent?.slice(0, 80)}</span></span>
              <span className="text-[11px] text-slate-500">{timeAgo(s.lastSeenAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
