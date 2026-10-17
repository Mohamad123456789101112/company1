import { CheckCircle2, Database, Fingerprint, KeyRound, LockKeyhole, ServerCog, ShieldCheck, XCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { configReport } from "@/lib/config";
import { Alert, Badge, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * حالة الحماية والربط.
 * ⚠️ تعرض فقط «جاهز / ناقص» لكل إعداد — لا تُظهر أي مفتاح، ولا رابط قاعدة
 * البيانات، ولا محتوى ملف الإعدادات أو ملف SQL. الملف نفسه محمي في
 * `config/platform.config.ts` خارج مجلد الويب ومستورد بـ server-only.
 */
export default async function SecurityStatusPage() {
  await requireAdmin();
  const report = configReport();

  const rows = [
    { key: "DATABASE_URL", label: "قاعدة البيانات (Supabase PostgreSQL)", ok: report.database, hint: "رابط الاتصال يُدار من متغيرات البيئة على الخادم فقط", icon: Database },
    { key: "NEXT_PUBLIC_APP_URL", label: "الرابط الرسمي للمنصة", ok: report.appUrl, hint: "مطلوب لكوكيز آمنة وتحويل Google OAuth", icon: ServerCog },
    { key: "GOOGLE_CLIENT_ID / SECRET", label: "تسجيل الدخول عبر Google", ok: report.google, hint: "Google Cloud Console → OAuth 2.0 Client", icon: Fingerprint },
    { key: "ADMIN_EMAILS", label: "بريد المدير التلقائي", ok: report.adminEmails, hint: "أي حساب بهذا البريد يُرقّى لمدير عند الدخول", icon: KeyRound },
    { key: "MEDIA_SIGNING_SECRET", label: "سر توقيع روابط الفيديو والـ PDF", ok: report.mediaSecret, hint: "روابط مؤقتة لا تعمل خارج المنصة", icon: LockKeyhole },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="النظام"
        title="حالة الحماية والربط"
        subtitle="ملخص جاهزية الحماية — بدون عرض أي مفتاح أو محتوى ملفات الإعداد"
      />

      <Alert tone="info">
        <b>ملف الإعدادات معزول:</b> كل بيانات الربط (Supabase + Google Auth + أسرار التوقيع) محفوظة في
        ملف إعدادات خاص داخل السورس (<code dir="ltr">config/platform.config.ts</code>) يقرأ القيم من
        متغيرات البيئة، وهو <b>غير متاح من لوحة التحكم</b> ولا يمكن فتحه أو تنزيله منها. صفحة دليل
        التشغيل و SQL تم حذفها نهائيًا؛ التشغيل الموثّق في ملف <code dir="ltr">docs/SETUP.md</code> داخل المستودع.
      </Alert>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => (
          <div key={r.key} className="card flex items-start justify-between gap-3 p-5">
            <span className="flex min-w-0 items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><r.icon className="size-5" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-slate-900">{r.label}</span>
                <span className="mt-0.5 block text-[11px] leading-5 text-slate-500">{r.hint}</span>
                <span className="mt-1 block break-all font-mono text-[10px] text-slate-400" dir="ltr">{r.key}</span>
              </span>
            </span>
            <Badge tone={r.ok ? "success" : "warning"} className="shrink-0">
              {r.ok ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />} {r.ok ? "جاهز" : "ناقص"}
            </Badge>
          </div>
        ))}
      </div>

      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><ShieldCheck className="size-5 text-emerald-600" /> ما هو مفعّل الآن لحماية المنصة</h2>
        <ul className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          {[
            "ملف الإعدادات خارج مجلد الويب (src) — لا يمكن الوصول إليه عبر أي رابط",
            "الـ proxy يرفض أي طلب لـ /config أو /supabase أو /.env أو /scripts",
            "كل قراءة للإعدادات تتم على الخادم فقط عبر حزمة server-only",
            "لا تظهر أي مفاتيح أو روابط اتصال داخل واجهة الإدارة أو الـ HTML",
            "كلمات المرور bcrypt (cost 12) والجلسات مخزّنة بـ SHA-256 في قاعدة البيانات",
            "حد لمحاولات الدخول لكل حساب وIP مع قفل تلقائي",
            "Google OAuth مع PKCE و state ضد CSRF",
            "روابط الفيديو/PDF موقّعة وتنتهي صلاحيتها تلقائيًا",
            "رؤوس أمان كاملة: CSP و HSTS و X-Frame-Options و Referrer-Policy",
            "سجل تدقيق لكل الأحداث الحساسة مع عنوان IP",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {t}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
