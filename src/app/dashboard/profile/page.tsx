import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { MonitorSmartphone, LogOut } from "lucide-react";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { currentSessionId, requireUser } from "@/lib/auth";
import { revokeOtherSessionsAction, revokeSessionAction } from "@/actions/auth";
import { PasswordForm, ProfileForm } from "@/components/dashboard/profile-forms";
import { Badge, PageHeader } from "@/components/ui";
import { getSettings } from "@/lib/settings";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "الملف الشخصي" };

export default async function ProfilePage() {
  const user = await requireUser("/dashboard/profile");
  const [list, current, s] = await Promise.all([
    db.select().from(sessions).where(eq(sessions.userId, user.id)).orderBy(desc(sessions.lastSeenAt)),
    currentSessionId(),
    getSettings(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="الحساب" title="الملف الشخصي" subtitle="بياناتك، كلمة المرور، والأجهزة المتصلة بحسابك" />

      <section className="card p-6">
        <h2 className="mb-4 text-lg font-black text-slate-900">البيانات الشخصية</h2>
        <ProfileForm user={user} />
      </section>

      <section id="password" className="card p-6">
        <h2 className="mb-4 text-lg font-black text-slate-900">كلمة المرور</h2>
        <PasswordForm hasPassword={Boolean(user.passwordHash)} />
      </section>

      <section className="card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><MonitorSmartphone className="size-5 text-brand-400" /> الأجهزة المتصلة</h2>
            <p className="mt-1 text-xs text-slate-500">الحد الأقصى {s.max_devices} أجهزة في نفس الوقت. عند تسجيل الدخول من جهاز جديد يتم فصل الأقدم تلقائيًا.</p>
          </div>
          {list.length > 1 && (
            <form action={revokeOtherSessionsAction}>
              <button className="btn btn-danger btn-sm"><LogOut className="size-3.5" /> تسجيل الخروج من باقي الأجهزة</button>
            </form>
          )}
        </div>
        <ul className="divide-y divide-white/[0.06]">
          {list.map((sess) => (
            <li key={sess.id} className="flex items-center justify-between gap-4 py-3">
              <span>
                <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  {sess.deviceLabel ?? "جهاز"}
                  {sess.id === current && <Badge tone="success">هذا الجهاز</Badge>}
                </span>
                <span className="block text-[11px] text-slate-500">آخر نشاط {timeAgo(sess.lastSeenAt)} • IP: {sess.ip ?? "—"}</span>
              </span>
              {sess.id !== current && (
                <form action={revokeSessionAction}>
                  <input type="hidden" name="sessionId" value={sess.id} />
                  <button className="btn btn-outline btn-sm">فصل</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
