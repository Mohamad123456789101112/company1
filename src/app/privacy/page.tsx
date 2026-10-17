import type { Metadata } from "next";
import { SiteShell } from "@/components/site/shell";
import { PageHeader } from "@/components/ui";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "سياسة الخصوصية" };

export default async function PrivacyPage() {
  const s = await getSettings();
  return (
    <SiteShell>
      <PageHeader title="سياسة الخصوصية" subtitle={`آخر تحديث: ${new Date().getFullYear()}`} />
      <div className="card prose-ar mx-auto max-w-3xl space-y-4 p-8">
        <p>نحن في {s.site_name} نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. توضح هذه السياسة البيانات التي نجمعها وكيفية استخدامها.</p>
        <h3 className="text-base font-black text-slate-900">البيانات التي نجمعها</h3>
        <p>الاسم، البريد الإلكتروني، رقم هاتف الطالب وولي الأمر، الصف الدراسي، والمحافظة. كما نسجل عنوان IP ونوع الجهاز عند تسجيل الدخول لأغراض الحماية من الاختراق.</p>
        <h3 className="text-base font-black text-slate-900">كيف نستخدم البيانات</h3>
        <p>لتقديم المحتوى التعليمي، متابعة التقدم ونتائج الامتحانات، التواصل مع ولي الأمر، ومعالجة طلبات الشحن. لا نبيع بياناتك لأي طرف ثالث.</p>
        <h3 className="text-base font-black text-slate-900">الأمان</h3>
        <p>كلمات المرور مشفرة بخوارزمية bcrypt ولا يمكن لأحد الاطلاع عليها. الاتصال بالمنصة مشفر عبر HTTPS، ويتم تحديد عدد محاولات الدخول والأجهزة المتصلة لحماية الحساب.</p>
        <h3 className="text-base font-black text-slate-900">تسجيل الدخول عبر Google</h3>
        <p>عند استخدام حساب Google نحصل فقط على الاسم والبريد الإلكتروني وصورة الملف الشخصي، ولا نصل إلى أي بيانات أخرى.</p>
        <h3 className="text-base font-black text-slate-900">حقوقك</h3>
        <p>يمكنك تعديل بياناتك من صفحة الملف الشخصي أو طلب حذف حسابك بالتواصل معنا عبر واتساب.</p>
      </div>
    </SiteShell>
  );
}
