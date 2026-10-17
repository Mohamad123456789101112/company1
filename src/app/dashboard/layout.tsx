import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { ShieldAlert } from "lucide-react";
import { db } from "@/db";
import { paymentRequests } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getRecentNotifications, getUnreadNotificationCount } from "@/lib/data";
import { logoutAction } from "@/actions/auth";
import { markNotificationsReadAction } from "@/actions/student";
import { DashboardShell, type ShellNavItem } from "@/components/dashboard/shell";
import { RealtimeListener } from "@/components/realtime";
import { gradeLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser("/dashboard");
  if (user.role === "student" && (!user.phone || !user.parentPhone || !user.grade)) redirect("/complete-profile");

  const [s, unread, notifs, [pending]] = await Promise.all([
    getSettings(),
    getUnreadNotificationCount(user.id),
    getRecentNotifications(user.id, 8),
    db.select({ c: count() }).from(paymentRequests).where(and(eq(paymentRequests.userId, user.id), eq(paymentRequests.status, "pending"))),
  ]);

  const nav: ShellNavItem[] = [
    { href: "/dashboard", label: "الرئيسية", icon: "home", exact: true, section: "مذاكرتي" },
    { href: "/dashboard/courses", label: "كورساتي", icon: "book", section: "مذاكرتي" },
    { href: "/dashboard/exams", label: "الامتحانات", icon: "exams", section: "مذاكرتي" },
    { href: "/dashboard/subscriptions", label: "اشتراكاتي", icon: "shield", section: "الاشتراك" },
    { href: "/dashboard/purchases", label: "طلبات الدفع", icon: "cart", badge: Number(pending?.c ?? 0), section: "الاشتراك" },
    { href: "/dashboard/codes", label: "كود السنتر", icon: "code", section: "الاشتراك" },
    { href: "/courses", label: "تصفح الكورسات", icon: "globe", section: "الاشتراك" },
    { href: "/dashboard/notifications", label: "الإشعارات والإعلانات", icon: "bell", badge: unread, section: "حسابي" },
    { href: "/dashboard/profile", label: "الملف الشخصي والأجهزة", icon: "user", section: "حسابي" },
  ];

  return (
    <DashboardShell
      variant="student"
      brand={{ siteName: s.site_name, teacherName: s.teacher_name }}
      user={{ name: user.name, email: user.email, avatarUrl: user.avatarUrl, role: user.role, subtitle: gradeLabel(user.grade) }}
      nav={nav}
      notifications={notifs.map((n) => ({ id: n.id, title: n.title, body: n.body, href: n.href, isRead: n.isRead, createdAt: n.createdAt.toISOString(), type: n.type }))}
      unread={unread}
      whatsapp={s.whatsapp || undefined}
      logout={logoutAction}
      markRead={markNotificationsReadAction}
    >
      {user.mustChangePassword && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="flex items-center gap-2"><ShieldAlert className="size-4" /> لأمان حسابك، يُرجى تغيير كلمة المرور المؤقتة.</span>
          <Link href="/dashboard/profile#password" className="btn btn-accent btn-sm">تغيير الآن</Link>
        </div>
      )}
      {children}
      <RealtimeListener scope="student" />
    </DashboardShell>
  );
}
