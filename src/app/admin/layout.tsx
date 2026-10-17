import type { ReactNode } from "react";
import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { ShieldAlert } from "lucide-react";
import { db } from "@/db";
import { contactMessages, paymentRequests } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { logoutAction } from "@/actions/auth";
import { DashboardShell, type ShellNavItem, type ShellNotification } from "@/components/dashboard/shell";
import { RealtimeListener } from "@/components/realtime";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const staff = await requireStaff();
  const [s, [pending], [unread], latestPending] = await Promise.all([
    getSettings(),
    db.select({ c: count() }).from(paymentRequests).where(eq(paymentRequests.status, "pending")),
    db.select({ c: count() }).from(contactMessages).where(eq(contactMessages.isRead, false)),
    db.select({ id: paymentRequests.id, amount: paymentRequests.amount, createdAt: paymentRequests.createdAt, aiScore: paymentRequests.aiScore }).from(paymentRequests).where(eq(paymentRequests.status, "pending")).limit(6),
  ]);
  const pendingCount = Number(pending?.c ?? 0);
  const unreadCount = Number(unread?.c ?? 0);

  const nav: ShellNavItem[] = [
    { href: "/admin", label: "نظرة عامة", icon: "dashboard", exact: true, section: "الإدارة" },
    { href: "/admin/students", label: "الطلاب", icon: "students", section: "الإدارة" },
    { href: "/admin/courses", label: "الكورسات والدروس", icon: "courses", section: "المحتوى" },
    { href: "/admin/exams", label: "الامتحانات", icon: "exams", section: "المحتوى" },
    { href: "/admin/media", label: "إعدادات الفيديو (Bunny)", icon: "ai", section: "المحتوى" },
    { href: "/admin/announcements", label: "الإعلانات (إشعارات للطلاب)", icon: "megaphone", section: "المحتوى" },
    { href: "/admin/testimonials", label: "آراء الطلاب", icon: "testimonials", section: "المحتوى" },
    { href: "/admin/images", label: "صور الموقع", icon: "image", section: "المظهر" },
    { href: "/admin/payments", label: "طلبات الدفع", icon: "payments", badge: pendingCount, section: "المبيعات" },
    { href: "/admin/codes", label: "أكواد السنتر", icon: "code", section: "المبيعات" },
    { href: "/admin/ai", label: "التحقق بالذكاء الاصطناعي", icon: "ai", section: "المبيعات" },
    { href: "/admin/messages", label: "رسائل التواصل", icon: "messages", badge: unreadCount, section: "النظام" },
    { href: "/admin/audit", label: "سجل الأمان", icon: "audit", section: "النظام" },
    { href: "/admin/settings", label: "إعدادات المنصة", icon: "settings", section: "النظام" },
    { href: "/admin/setup", label: "الحماية والتشغيل", icon: "setup", section: "النظام" },
  ];

  const notifications: ShellNotification[] = latestPending.map((p) => ({
    id: p.id,
    title: `طلب دفع جديد بقيمة ${p.amount} جنيه`,
    body: p.aiScore != null ? `درجة التحقق الآلي: ${p.aiScore}% – بانتظار المراجعة` : `بانتظار المراجعة منذ ${formatDate(p.createdAt, true)}`,
    href: "/admin/payments",
    isRead: false,
    createdAt: p.createdAt.toISOString(),
    type: "payment",
  }));

  return (
    <DashboardShell
      variant="admin"
      brand={{ siteName: s.site_name, teacherName: s.teacher_name }}
      user={{ name: staff.name, email: staff.email, avatarUrl: staff.avatarUrl, role: staff.role, subtitle: staff.role === "admin" ? "مدير المنصة" : "مساعد" }}
      nav={nav}
      notifications={notifications}
      unread={pendingCount}
      whatsapp={s.whatsapp || undefined}
      logout={logoutAction}
    >
      {staff.mustChangePassword && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span className="flex items-center gap-2"><ShieldAlert className="size-4" /> أنت تستخدم كلمة المرور الافتراضية! غيّرها فورًا لحماية المنصة.</span>
          <Link href="/dashboard/profile#password" className="btn btn-danger btn-sm">تغيير كلمة المرور</Link>
        </div>
      )}
      {children}
      <RealtimeListener scope="admin" />
    </DashboardShell>
  );
}
