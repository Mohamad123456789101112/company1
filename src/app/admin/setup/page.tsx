import { CheckCircle2, Lock, Rocket, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { Alert, PageHeader } from "@/components/ui";

/**
 * صفحة الحماية والتشغيل.
 * 🔐 قاعدة أمنية صارمة: لا يُعرض هنا – ولا في أي مكان داخل لوحة التحكم –
 * أي ملف إعدادات أو كود SQL أو مفاتيح Google Auth / Supabase. كل ذلك معزول
 * في ملف محمي (src/lib/secure-config.ts + .env) يُقرأ من السيرفر فقط.
 */
export default async function SetupPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="النظام"
        title="الحماية والتشغيل"
        subtitle="إعدادات الربط الحساسة معزولة في ملف محمي ولا تظهر داخل لوحة التحكم"
      />

      <Alert tone="info">
        <span className="flex items-start gap-2">
          <Lock className="mt-0.5 size-4 shrink-0 text-brand-600" />
          <span>
            ملف الإعدادات الحساس (Google Auth + اتصال Supabase + أكواد الـ SQL Editor) موجود في
            <code className="mx-1 rounded bg-slate-100 px-1" dir="ltr">.env</code>
            و
            <code className="mx-1 rounded bg-slate-100 px-1" dir="ltr">src/lib/secure-config.ts</code>
            – محمي وممنوع عرضه أو فتحه من لوحة التحكم نهائيًا. غيّره فقط من لوحة الاستضافة
            (Vercel → Environment Variables) أو من ملف الخادم مباشرة.
          </span>
        </span>
      </Alert>

      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><Rocket className="size-5 text-brand-600" /> خطوات التشغيل (تتم خارج المنصة – للمسؤول فقط)</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { t: "قاعدة البيانات", d: "أنشئ مشروع Supabase وشغّل ملف SQL مرة واحدة. أضف DATABASE_URL أو فعّل تكامل Supabase في Vercel ليستخدم التطبيق POSTGRES_URL تلقائيًا." },
            { t: "رفع الموقع", d: "ارفع الكود على GitHub واربطه بـ Vercel، وأضف متغيرات البيئة (.env) في إعدادات المشروع." },
            { t: "تسجيل Google", d: "أنشئ OAuth Client في Google Cloud وضع المفاتيح في GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET." },
          ].map((s, i) => (
            <li key={s.t} className="rounded-2xl border border-lav-200 bg-lav-50/60 p-4">
              <p className="flex items-center gap-2 text-sm font-black text-slate-900">
                <span className="grid size-7 place-items-center rounded-full bg-brand-500 text-xs font-bold text-white">{i + 1}</span>
                {s.t}
              </p>
              <p className="mt-2 text-xs leading-6 text-slate-600">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><ShieldCheck className="size-5 text-emerald-600" /> إجراءات الأمان المفعّلة</h2>
        <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          {[
            "عزل ملفات الربط والـ SQL في Config محمي (Server-Only) لا يُفتح من لوحة التحكم",
            "حد أقصى 5 محاولات دخول لكل حساب و20 لكل IP كل 15 دقيقة (Brute-force)",
            "قفل الحساب تلقائيًا بعد 5 محاولات فاشلة (15 دقيقة) و10 (ساعة)",
            "تشفير كلمات المرور bcrypt (cost 12) مع معادلة توقيت ضد التخمين",
            "جلسات مخزنة بقاعدة البيانات (SHA-256) مع حد للأجهزة وإمكانية الفصل",
            "كوكيز HttpOnly + Secure + SameSite وحماية CSRF المدمجة في Server Actions",
            "رؤوس أمان: CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy",
            "Google OAuth مع PKCE و state موقّع ضد CSRF",
            "التحقق من كل المدخلات بـ Zod + استعلامات مُعاملة (لا SQL Injection)",
            "حد للطلبات على الأكواد والتسجيل والتواصل وطلبات الدفع",
            "عمليات المحفظة ذرّية (لا إنفاق مزدوج) وسجل تدقيق كامل",
            "روابط الفيديو لا تُرسل أبدًا لغير المشتركين + علامة مائية بهوية الطالب",
            "حماية من Open Redirect وIDOR (كل استعلام مقيّد بهوية المستخدم)",
            "المفاتيح السرية (AI / Bunny) تُخزَّن مُقنّعة ولا تُعاد للواجهة كاملة أبدًا",
          ].map((t) => <li key={t} className="flex items-start gap-2"><CheckCircle2 className="mt-1 size-3.5 shrink-0 text-emerald-600" /> {t}</li>)}
        </ul>
      </section>
    </div>
  );
}
