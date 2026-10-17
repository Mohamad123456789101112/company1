import Link from "next/link";
import { desc, eq, ne } from "drizzle-orm";
import { Bot, Check, ImageIcon, ScanSearch, X } from "lucide-react";
import { db } from "@/db";
import { courses, paymentRequests, users } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { aiConfigured } from "@/lib/payments";
import { analyzePaymentAction, reviewPaymentAction } from "@/actions/admin";
import { Badge, Input, PageHeader } from "@/components/ui";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import type { AiVerdict } from "@/lib/ai-types";

const METHOD: Record<string, string> = { vodafone_cash: "فودافون كاش", instapay: "إنستاباي", fawry: "فوري", other: "أخرى" };

function Verdict({ v }: { v: AiVerdict | null }) {
  if (!v) return <p className="text-xs text-slate-500">لم يتم التحقق الآلي بعد.</p>;
  const tone = v.error ? "neutral" : v.score >= 85 ? "success" : v.score >= 50 ? "warning" : "danger";
  const m = (b: boolean | null) => (b === null ? "—" : b ? "✓" : "✕");
  return (
    <div className={cn("rounded-xl border p-3 text-xs", tone === "success" ? "border-emerald-200 bg-emerald-50/60" : tone === "warning" ? "border-amber-200 bg-amber-50/60" : tone === "danger" ? "border-rose-200 bg-rose-50/60" : "border-lav-200 bg-lav-50")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-bold text-slate-800"><Bot className="size-4 text-brand-500" /> التحقق الآلي ({v.provider} • {v.model})</span>
        <Badge tone={tone}>{v.error ? "خطأ" : `درجة الثقة ${v.score}%`}</Badge>
      </div>
      {v.error ? (
        <p className="mt-2 text-rose-700">{v.error}</p>
      ) : (
        <>
          <p className="mt-2 leading-6 text-slate-700">{v.summary || (v.isReceipt ? "تم التعرف على إيصال تحويل." : "الصورة لا تبدو إيصال تحويل.")}</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white/70 p-2"><p className="text-[10px] text-slate-500">المبلغ</p><p className="font-bold">{v.amount ?? "—"} <span className={v.matches.amount === false ? "text-rose-600" : "text-emerald-600"}>{m(v.matches.amount)}</span></p></div>
            <div className="rounded-lg bg-white/70 p-2"><p className="text-[10px] text-slate-500">المستلم</p><p className="font-bold" dir="ltr">{v.recipient ?? "—"} <span className={v.matches.recipient === false ? "text-rose-600" : "text-emerald-600"}>{m(v.matches.recipient)}</span></p></div>
            <div className="rounded-lg bg-white/70 p-2"><p className="text-[10px] text-slate-500">المرجع</p><p className="font-bold" dir="ltr">{v.reference ?? "—"} <span className={v.matches.reference === false ? "text-rose-600" : "text-emerald-600"}>{m(v.matches.reference)}</span></p></div>
          </div>
          {(v.date || v.statusText) && <p className="mt-2 text-slate-500">{v.date ? `التاريخ: ${v.date}` : ""} {v.statusText ? `• الحالة: ${v.statusText}` : ""}</p>}
          {v.tampering.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-rose-700">
              {v.tampering.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const s = await getSettings();
  const ai = aiConfigured(s);
  const filter = sp.status === "approved" || sp.status === "rejected" ? sp.status : "pending";

  const base = db
    .select({ p: paymentRequests, name: users.name, phone: users.phone, userId: users.id, courseTitle: courses.title })
    .from(paymentRequests)
    .innerJoin(users, eq(users.id, paymentRequests.userId))
    .leftJoin(courses, eq(courses.id, paymentRequests.courseId));
  const rows = filter === "pending"
    ? await base.where(eq(paymentRequests.status, "pending")).orderBy(desc(paymentRequests.createdAt)).limit(200)
    : await base.where(eq(paymentRequests.status, filter)).orderBy(desc(paymentRequests.reviewedAt)).limit(200);
  const [pendingCount] = await db.select({ c: ne(paymentRequests.status, "approved") }).from(paymentRequests).limit(1);
  void pendingCount;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="المبيعات" title="طلبات الدفع" subtitle="راجع إيصالات فودافون كاش – التأكيد يفعّل الكورس فورًا ويُرسل إشعارًا للطالب" actions={!ai ? <Link href="/admin/ai" className="btn btn-outline btn-sm"><Bot className="size-4" /> فعّل التحقق الآلي</Link> : <Badge tone="success"><Bot className="size-3" /> التحقق الآلي مفعّل</Badge>} />

      <div className="flex gap-2 border-b border-lav-200">
        {[["pending", "قيد المراجعة"], ["approved", "مؤكدة"], ["rejected", "مرفوضة"]].map(([k, l]) => (
          <Link key={k} href={`/admin/payments?status=${k}`} className={cn("-mb-px border-b-2 px-4 py-2.5 text-sm font-bold transition", filter === k ? "border-brand-500 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800")}>{l}</Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="card p-10 text-center text-sm text-slate-500">{filter === "pending" ? "لا توجد طلبات معلّقة 🎉" : "لا توجد طلبات"}</p>
      ) : (
        <div className="space-y-4">
          {rows.map(({ p, name, phone, userId, courseTitle }) => (
            <div key={p.id} className="card grid gap-5 p-5 lg:grid-cols-[220px_1fr]">
              {/* receipt */}
              <div>
                {p.receiptFileId ? (
                  <a href={`/api/files/${p.receiptFileId}`} target="_blank" rel="noopener noreferrer" className="group relative block overflow-hidden rounded-xl border border-lav-200 bg-lav-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/files/${p.receiptFileId}`} alt="إيصال" className="aspect-[3/4] w-full object-cover transition group-hover:scale-105" loading="lazy" />
                    <span className="absolute bottom-2 right-2 rounded-md bg-slate-900/70 px-2 py-0.5 text-[10px] font-bold text-white">فتح الإيصال</span>
                  </a>
                ) : (
                  <div className="grid aspect-[3/4] place-items-center rounded-xl border border-dashed border-lav-300 bg-lav-50 text-slate-400"><ImageIcon className="size-8" /></div>
                )}
              </div>

              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-amin text-base font-bold text-slate-900">{courseTitle ?? "شحن رصيد"}</p>
                    <p className="text-xs text-slate-500"><Link href={`/admin/students/${userId}`} className="font-bold text-brand-600 hover:underline">{name}</Link> • <span dir="ltr">{phone}</span> • {formatDate(p.createdAt, true)}</p>
                  </div>
                  <div className="text-end">
                    <p className="font-amin text-xl font-bold text-brand-700">{formatMoney(p.amount)}</p>
                    {p.status === "pending" ? <Badge tone="warning">قيد المراجعة</Badge> : p.status === "approved" ? <Badge tone="success">مؤكد</Badge> : <Badge tone="danger">مرفوض</Badge>}
                  </div>
                </div>
                <div className="grid gap-2 text-xs sm:grid-cols-3">
                  <div className="rounded-lg bg-lav-50 p-2"><p className="text-slate-500">الطريقة</p><p className="font-bold text-slate-800">{METHOD[p.method]}</p></div>
                  <div className="rounded-lg bg-lav-50 p-2"><p className="text-slate-500">محوّل من</p><p className="font-mono font-bold text-slate-800" dir="ltr">{p.senderPhone}</p></div>
                  <div className="rounded-lg bg-lav-50 p-2"><p className="text-slate-500">رقم العملية</p><p className="font-mono font-bold text-slate-800" dir="ltr">{p.reference ?? "—"}</p></div>
                </div>
                <Verdict v={p.aiVerdict ?? null} />
                {p.adminNote && <p className="text-xs text-slate-500">ملاحظة: {p.adminNote} {p.reviewedAt ? `• ${formatDate(p.reviewedAt, true)}` : ""}</p>}

                {p.status === "pending" && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-lav-200 pt-3">
                    {ai && p.receiptFileId && (
                      <form action={analyzePaymentAction}>
                        <input type="hidden" name="paymentId" value={p.id} />
                        <button className="btn btn-outline btn-sm"><ScanSearch className="size-4" /> {p.aiCheckedAt ? "إعادة التحليل بالذكاء الاصطناعي" : "تحليل الإيصال بالذكاء الاصطناعي"}</button>
                      </form>
                    )}
                    <form action={reviewPaymentAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="paymentId" value={p.id} />
                      <Input name="note" placeholder="ملاحظة للطالب (اختياري)" className="w-52" maxLength={300} />
                      <button name="decision" value="approve" className="btn btn-success btn-sm"><Check className="size-4" /> تأكيد وتفعيل الكورس</button>
                      <button name="decision" value="reject" className="btn btn-danger btn-sm"><X className="size-4" /> رفض</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
