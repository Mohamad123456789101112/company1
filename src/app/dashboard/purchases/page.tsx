import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { CheckCircle2, Clock3, Receipt, XCircle } from "lucide-react";
import { db } from "@/db";
import { courses, paymentRequests } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { Alert, Badge, EmptyState, PageHeader } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "مشترياتي" };

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser("/dashboard/purchases");
  const rows = await db
    .select({ p: paymentRequests, title: courses.title, slug: courses.slug })
    .from(paymentRequests)
    .leftJoin(courses, eq(courses.id, paymentRequests.courseId))
    .where(eq(paymentRequests.userId, user.id))
    .orderBy(desc(paymentRequests.createdAt))
    .limit(100);

  const steps = (status: string) => [
    { l: "تم إرسال الطلب", done: true },
    { l: "التحقق من التحويل", done: status !== "pending", active: status === "pending" },
    { l: status === "rejected" ? "مرفوض" : "تم تفعيل الكورس", done: status === "approved", failed: status === "rejected" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="المشتريات" title="مشترياتي وطلبات الدفع" subtitle="تابع حالة كل عملية شراء – يتم تفعيل الكورس تلقائيًا فور تأكيد التحويل" />
      {sp.submitted && <Alert tone="success">تم استلام طلب الدفع بنجاح. سيتم مراجعة الإيصال وتفعيل الكورس في أقرب وقت، وستصلك إشعارًا فور التأكيد.</Alert>}

      {rows.length === 0 ? (
        <EmptyState title="لا توجد مشتريات بعد" description="عند شراء أي كورس بفودافون كاش ستظهر حالة الطلب هنا." action={<Link href="/courses" className="btn btn-primary">تصفح الكورسات</Link>} />
      ) : (
        <div className="space-y-4">
          {rows.map(({ p, title, slug }) => (
            <div key={p.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-amin text-base font-bold text-slate-900">{title ?? "شحن رصيد"}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{formatDate(p.createdAt, true)} • فودافون كاش • مرجع: <span className="font-mono" dir="ltr">{p.reference ?? "—"}</span></p>
                </div>
                <div className="text-end">
                  <p className="font-amin text-lg font-bold text-brand-700">{formatMoney(p.amount)}</p>
                  {p.status === "pending" && <Badge tone="warning"><Clock3 className="size-3" /> قيد المراجعة</Badge>}
                  {p.status === "approved" && <Badge tone="success"><CheckCircle2 className="size-3" /> مؤكد</Badge>}
                  {p.status === "rejected" && <Badge tone="danger"><XCircle className="size-3" /> مرفوض</Badge>}
                </div>
              </div>

              <ol className="mt-4 grid grid-cols-3 gap-2">
                {steps(p.status).map((s, i) => (
                  <li key={i} className="flex flex-col items-center text-center">
                    <span className={`grid size-7 place-items-center rounded-full text-xs font-black ${s.failed ? "bg-rose-500 text-white" : s.done ? "bg-emerald-500 text-white" : s.active ? "bg-brand-500 text-white ring-4 ring-brand-100" : "bg-lav-200 text-slate-500"}`}>{s.failed ? "✕" : s.done ? "✓" : i + 1}</span>
                    <span className="mt-1 text-[11px] font-bold text-slate-600">{s.l}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-lav-200 pt-3 text-xs">
                <span className="text-slate-500">{p.adminNote ? `ملاحظة الإدارة: ${p.adminNote}` : p.status === "pending" ? "عادةً تتم المراجعة خلال ساعات قليلة" : ""}</span>
                <span className="flex gap-2">
                  {p.receiptFileId && <a href={`/api/files/${p.receiptFileId}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm"><Receipt className="size-3.5" /> الإيصال</a>}
                  {p.status === "approved" && slug && <Link href={`/learn/${slug}`} className="btn btn-primary btn-sm">ابدأ الكورس</Link>}
                  {p.status === "rejected" && slug && <Link href={`/checkout/${slug}`} className="btn btn-accent btn-sm">إعادة المحاولة</Link>}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
