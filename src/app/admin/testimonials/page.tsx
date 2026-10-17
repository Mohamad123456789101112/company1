import { asc, desc } from "drizzle-orm";
import { Eye, EyeOff, Star, Trash2 } from "lucide-react";
import { db } from "@/db";
import { testimonials } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { deleteTestimonialAction, toggleTestimonialAction } from "@/actions/admin";
import { TestimonialForm } from "@/components/admin/forms";
import { Collapsible, ConfirmForm } from "@/components/ui-client";
import { Avatar, Badge, PageHeader } from "@/components/ui";
import { gradeLabel } from "@/lib/utils";

export default async function AdminTestimonials() {
  await requireStaff();
  const list = await db.select().from(testimonials).orderBy(asc(testimonials.orderIndex), desc(testimonials.createdAt)).limit(200);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="الصفحة الرئيسية" title="آراء الطلاب" subtitle="تظهر في قسم «طلابنا بيقولوا إيه؟» بالصفحة الرئيسية – وحتى تضيف آراءك الحقيقية تُعرض 6 آراء افتراضية ثابتة تلقائيًا" />
      <Collapsible title="إضافة رأي جديد" defaultOpen={list.length === 0}><TestimonialForm /></Collapsible>
      <div className="grid gap-4 md:grid-cols-2">
        {list.length === 0 && <p className="card p-6 text-center text-sm text-slate-500 md:col-span-2">لا توجد آراء بعد.</p>}
        {list.map((t) => (
          <div key={t.id} className={`card flex flex-col gap-3 p-5 ${t.isPublished ? "" : "opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={t.name} src={t.avatarUrl} size={40} />
                <div>
                  <p className="text-sm font-bold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role ?? "—"} {t.grade ? `• ${gradeLabel(t.grade)}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: t.stars }).map((_, i) => <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />)}
              </div>
            </div>
            <p className="font-taj text-sm leading-7 text-slate-600">{t.text}</p>
            <div className="flex flex-wrap items-center gap-2">
              {!t.isPublished && <Badge tone="warning">مخفي</Badge>}
              <Badge tone="neutral">ترتيب {t.orderIndex}</Badge>
              <div className="ms-auto flex gap-2">
                <form action={toggleTestimonialAction}><input type="hidden" name="testimonialId" value={t.id} /><button className="btn btn-outline btn-sm">{t.isPublished ? <><EyeOff className="size-3.5" /> إخفاء</> : <><Eye className="size-3.5" /> إظهار</>}</button></form>
                <ConfirmForm action={deleteTestimonialAction} message="حذف هذا الرأي؟"><input type="hidden" name="testimonialId" value={t.id} /><button className="btn btn-danger btn-sm"><Trash2 className="size-3.5" /></button></ConfirmForm>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
