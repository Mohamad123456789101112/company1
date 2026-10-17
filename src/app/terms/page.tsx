import type { Metadata } from "next";
import { SiteShell } from "@/components/site/shell";
import { PageHeader } from "@/components/ui";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "شروط الاستخدام" };

export default async function TermsPage() {
  const s = await getSettings();
  return (
    <SiteShell>
      <PageHeader title="شروط الاستخدام" subtitle="يرجى قراءة الشروط بعناية قبل استخدام المنصة" />
      <div className="card prose-ar mx-auto max-w-3xl space-y-4 p-8">
        <h3 className="text-base font-black text-slate-900">1. الحساب الشخصي</h3>
        <p>الحساب شخصي ولا يجوز مشاركته. الحد الأقصى للأجهزة المتصلة {s.max_devices} أجهزة، وأي محاولة لمشاركة الحساب تعرّضه للإيقاف دون استرداد.</p>
        <h3 className="text-base font-black text-slate-900">2. المحتوى التعليمي</h3>
        <p>جميع الفيديوهات والملفات والامتحانات ملكية فكرية لـ {s.teacher_name}. يُمنع تسجيلها أو إعادة نشرها أو بيعها بأي شكل، ويتم تتبع ذلك عبر العلامة المائية الخاصة بكل طالب.</p>
        <h3 className="text-base font-black text-slate-900">3. الاشتراكات والمدفوعات</h3>
        <p>يتم الاشتراك عبر رصيد المحفظة أو أكواد التفعيل. المبالغ المدفوعة غير قابلة للاسترداد بعد تفعيل الكورس. طلبات الشحن بالتحويل تُراجع يدويًا خلال ساعات العمل.</p>
        <h3 className="text-base font-black text-slate-900">4. الامتحانات</h3>
        <p>الامتحانات الإلكترونية مؤقتة ويتم تسليمها تلقائيًا عند انتهاء الوقت. عدد المحاولات محدد لكل امتحان.</p>
        <h3 className="text-base font-black text-slate-900">5. الإيقاف</h3>
        <p>تحتفظ الإدارة بحق إيقاف أي حساب يخالف هذه الشروط أو يحاول العبث بأمان المنصة.</p>
      </div>
    </SiteShell>
  );
}
