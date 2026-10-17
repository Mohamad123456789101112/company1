import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/auth";
import { Badge, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";

const DANGER = new Set(["login.failed", "login.rate_limited", "code.failed", "code.rate_limited", "admin.user_banned", "admin.user_deleted"]);
const LABELS: Record<string, string> = {
  "login.success": "تسجيل دخول", "login.failed": "دخول فاشل", "login.rate_limited": "حظر محاولات دخول", "login.google": "دخول Google",
  "user.registered": "تسجيل حساب", "user.registered_google": "تسجيل عبر Google", "user.password_changed": "تغيير كلمة مرور", "user.sessions_revoked": "فصل الأجهزة",
  "code.redeemed": "تفعيل كود", "code.failed": "كود خاطئ", "code.rate_limited": "حظر محاولات أكواد", "course.purchased": "شراء كورس", "course.enrolled_free": "تفعيل كورس مجاني",
  "payment.requested": "طلب شحن", "quiz.submitted": "تسليم امتحان",
};

export default async function AuditPage() {
  await requireSuperAdmin();
  const rows = await db
    .select({ log: auditLogs, userName: users.name, userEmail: users.email })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(300);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="الأمان" title="سجل الأمان والعمليات" subtitle="آخر 300 حدث: محاولات الدخول، الأكواد، المدفوعات، وإجراءات الإدارة" />
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>الوقت</th><th>الحدث</th><th>المستخدم</th><th>الهدف</th><th>تفاصيل</th><th>IP</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-500">لا توجد أحداث بعد</td></tr>}
            {rows.map(({ log, userName, userEmail }) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap text-xs text-slate-500">{formatDate(log.createdAt, true)}</td>
                <td><Badge tone={DANGER.has(log.action) ? "danger" : log.action.startsWith("admin.") ? "warning" : "neutral"}>{LABELS[log.action] ?? log.action}</Badge></td>
                <td className="text-xs">{userName ? <>{userName}<span className="block text-[10px] text-slate-500" dir="ltr">{userEmail}</span></> : "—"}</td>
                <td className="text-xs text-slate-500">{log.targetType ? `${log.targetType}:${log.targetId?.slice(0, 8)}` : "—"}</td>
                <td className="max-w-xs truncate font-mono text-[11px] text-slate-500" dir="ltr">{log.meta ? JSON.stringify(log.meta) : "—"}</td>
                <td className="font-mono text-[11px] text-slate-500" dir="ltr">{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
