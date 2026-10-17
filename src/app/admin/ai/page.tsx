import { and, count, eq, isNotNull } from "drizzle-orm";
import { Bot, ShieldCheck, Sparkles } from "lucide-react";
import { db } from "@/db";
import { paymentRequests } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings, publicSettings } from "@/lib/settings";
import { AiSettingsForm } from "@/components/admin/forms";
import { PageHeader, StatCard } from "@/components/ui";

export default async function AiPage() {
  await requireAdmin();
  const s = publicSettings(await getSettings());
  const [[checked], [auto]] = await Promise.all([
    db.select({ c: count() }).from(paymentRequests).where(isNotNull(paymentRequests.aiCheckedAt)),
    db.select({ c: count() }).from(paymentRequests).where(and(eq(paymentRequests.status, "approved"), isNotNull(paymentRequests.aiCheckedAt))),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="المبيعات" title="التحقق من الإيصالات بالذكاء الاصطناعي" subtitle="اربط Gemini أو OpenAI ليقرأ إيصال التحويل ويقارن المبلغ ورقم المستلم ورقم العملية ويكشف التلاعب" />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="الحالة" value={s.ai_provider === "none" ? "معطّل" : s.ai_provider === "gemini" ? "Gemini" : "OpenAI"} icon={<Bot className="size-5" />} hint={s.ai_api_key ? `المفتاح: ${s.ai_api_key}` : "لا يوجد مفتاح"} />
        <StatCard label="إيصالات تم تحليلها" value={Number(checked.c)} icon={<Sparkles className="size-5" />} tone="accent" />
        <StatCard label="القبول الآلي" value={s.ai_auto_approve === "true" ? "مفعّل" : "يدوي"} icon={<ShieldCheck className="size-5" />} tone="success" hint={`${Number(auto.c)} طلب مؤكد بعد التحليل`} />
      </div>

      <section className="card p-6">
        <AiSettingsForm values={{ ai_provider: s.ai_provider, ai_model: s.ai_model, ai_auto_approve: s.ai_auto_approve, ai_min_confidence: s.ai_min_confidence }} maskedKey={s.ai_api_key} />
      </section>

      <section className="card p-6">
        <h2 className="font-amin text-base font-bold text-slate-900">كيف تحصل على مفتاح API؟</h2>
        <div className="mt-3 grid gap-4 font-taj text-sm leading-7 text-slate-600 md:grid-cols-2">
          <div className="rounded-2xl bg-lav-50 p-4">
            <p className="font-bold text-slate-900">Google Gemini (موصى به)</p>
            <ol className="mt-1 list-inside list-decimal">
              <li>افتح <span dir="ltr">aistudio.google.com/apikey</span></li>
              <li>اضغط Create API key وانسخه</li>
              <li>الصقه هنا واختر النموذج <span dir="ltr">gemini-2.0-flash</span></li>
            </ol>
          </div>
          <div className="rounded-2xl bg-lav-50 p-4">
            <p className="font-bold text-slate-900">OpenAI</p>
            <ol className="mt-1 list-inside list-decimal">
              <li>افتح <span dir="ltr">platform.openai.com/api-keys</span></li>
              <li>أنشئ مفتاحًا جديدًا وانسخه</li>
              <li>الصقه هنا واختر <span dir="ltr">gpt-4o-mini</span> (أرخص) أو <span dir="ltr">gpt-4o</span></li>
            </ol>
          </div>
        </div>
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-800">
          كيف يعمل التحقق؟ عند إرسال الطالب للإيصال يُرسَل للنموذج مع البيانات المتوقعة (المبلغ، رقمك، رقم العملية). يُعيد النموذج ما قرأه + علامات التلاعب + درجة الثقة، ثم يقارن الخادم القيم ويحسب درجة نهائية. مع «القبول الآلي» يُفعَّل الكورس فورًا فقط إذا تطابق كل شيء ولم تُرصد أي علامات تلاعب – وإلا يبقى الطلب لمراجعتك اليدوية.
        </p>
      </section>
    </div>
  );
}
