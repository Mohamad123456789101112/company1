import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Bell, BookOpen, CalendarClock, CheckCheck, CreditCard, Info, TriangleAlert } from "lucide-react";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { markNotificationsReadAction } from "@/actions/student";
import { EmptyState, PageHeader } from "@/components/ui";
import { cn, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "الإشعارات" };

const ICON = { info: Info, success: CheckCheck, warning: TriangleAlert, payment: CreditCard, exam: CalendarClock, course: BookOpen } as const;
const TONE = { info: "bg-sky-50 text-sky-600", success: "bg-emerald-50 text-emerald-600", warning: "bg-amber-50 text-amber-600", payment: "bg-brand-50 text-brand-600", exam: "bg-peach-50 text-peach-600", course: "bg-violet-50 text-violet-600" } as const;

export default async function NotificationsPage() {
  const user = await requireUser("/dashboard/notifications");
  const list = await db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(100);
  const unread = list.filter((n) => !n.isRead).length;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="حسابي" title="الإشعارات" subtitle={unread ? `${unread} إشعار غير مقروء` : "كل الإشعارات مقروءة"} actions={unread > 0 ? <form action={markNotificationsReadAction}><button className="btn btn-outline"><CheckCheck className="size-4" /> تحديد الكل كمقروء</button></form> : undefined} />
      {list.length === 0 ? (
        <EmptyState title="لا توجد إشعارات" description="ستصلك هنا تحديثات المدفوعات والامتحانات والكورسات." />
      ) : (
        <ul className="space-y-2">
          {list.map((n) => {
            const Icon = ICON[n.type] ?? Bell;
            const inner = (
              <div className={cn("card flex items-start gap-3 p-4 transition hover:border-brand-300", !n.isRead && "border-brand-200 bg-brand-50/40")}>
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", TONE[n.type] ?? TONE.info)}><Icon className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{n.title}</p>
                  <p className="mt-0.5 text-xs leading-6 text-slate-600">{n.body}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead && <span className="mt-2 size-2 rounded-full bg-brand-500" />}
              </div>
            );
            const anchor = n.href?.includes("#a-") ? n.href.split("#")[1] : undefined;
            return <li key={n.id} id={anchor}>{n.href && !anchor ? <Link href={n.href}>{inner}</Link> : inner}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
