import { desc } from "drizzle-orm";
import { Check, Trash2 } from "lucide-react";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { deleteMessageAction, markMessageReadAction } from "@/actions/admin";
import { ConfirmForm } from "@/components/ui-client";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { WhatsAppIcon } from "@/components/icons";
import { formatDate } from "@/lib/utils";

export default async function MessagesPage() {
  await requireStaff();
  const list = await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(200);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="التواصل" title="رسائل التواصل" subtitle="الرسائل الواردة من نموذج الموقع" />
      {list.length === 0 ? (
        <EmptyState title="لا توجد رسائل" />
      ) : (
        <div className="space-y-3">
          {list.map((m) => (
            <div key={m.id} className={`card p-5 ${m.isRead ? "opacity-70" : "border-brand-400/30"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-black text-slate-900">{m.name} {!m.isRead && <Badge tone="brand">جديد</Badge>}</span>
                <span className="text-[11px] text-slate-500">{formatDate(m.createdAt, true)}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">{m.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a href={`https://wa.me/2${m.phone}`} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm"><WhatsAppIcon className="size-3.5" /> رد واتساب <span dir="ltr">{m.phone}</span></a>
                {!m.isRead && <form action={markMessageReadAction}><input type="hidden" name="messageId" value={m.id} /><button className="btn btn-outline btn-sm"><Check className="size-3.5" /> تم القراءة</button></form>}
                <ConfirmForm action={deleteMessageAction} message="حذف الرسالة؟"><input type="hidden" name="messageId" value={m.id} /><button className="btn btn-ghost btn-sm text-rose-700"><Trash2 className="size-3.5" /></button></ConfirmForm>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
