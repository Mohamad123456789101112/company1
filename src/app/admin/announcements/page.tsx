import { desc } from "drizzle-orm";
import { Eye, EyeOff, Pin, Trash2 } from "lucide-react";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { deleteAnnouncementAction, toggleAnnouncementAction } from "@/actions/admin";
import { AnnouncementForm } from "@/components/admin/forms";
import { Collapsible, ConfirmForm } from "@/components/ui-client";
import { Badge, PageHeader } from "@/components/ui";
import { formatDate, gradeLabel } from "@/lib/utils";

export default async function AdminAnnouncements() {
  await requireStaff();
  const list = await db.select().from(announcements).orderBy(desc(announcements.isPinned), desc(announcements.createdAt)).limit(200);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="التواصل" title="الإعلانات" subtitle="كل إعلان يصل فورًا كإشعار في جرس الطلاب المستهدفين (الكل أو صف محدد) ويظهر رقمه على الأيقونة حتى يقرأه الطالب" />
      <Collapsible title="نشر إعلان جديد" defaultOpen={list.length === 0}><AnnouncementForm /></Collapsible>
      <div className="space-y-3">
        {list.length === 0 && <p className="card p-6 text-center text-sm text-slate-500">لا توجد إعلانات.</p>}
        {list.map((a) => (
          <div key={a.id} className="card flex flex-wrap items-start justify-between gap-3 p-5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {a.isPinned && <Badge tone="accent"><Pin className="size-3" /> مثبت</Badge>}
                <Badge tone={a.grade ? "brand" : "neutral"}>{a.grade ? gradeLabel(a.grade) : "الجميع"}</Badge>
                {!a.isPublished && <Badge tone="warning">مخفي</Badge>}
                <span className="text-[11px] text-slate-500">{formatDate(a.createdAt, true)}</span>
              </div>
              <h3 className="mt-2 text-sm font-black text-slate-900">{a.title}</h3>
              <p className="mt-1 line-clamp-3 text-xs leading-6 text-slate-500">{a.body}</p>
            </div>
            <div className="flex gap-2">
              <form action={toggleAnnouncementAction}><input type="hidden" name="announcementId" value={a.id} /><button className="btn btn-outline btn-sm">{a.isPublished ? <><EyeOff className="size-3.5" /> إخفاء</> : <><Eye className="size-3.5" /> إظهار</>}</button></form>
              <ConfirmForm action={deleteAnnouncementAction} message="حذف الإعلان؟"><input type="hidden" name="announcementId" value={a.id} /><button className="btn btn-danger btn-sm"><Trash2 className="size-3.5" /></button></ConfirmForm>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
