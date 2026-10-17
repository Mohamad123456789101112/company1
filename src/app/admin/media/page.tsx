import { Clapperboard, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { bunnyConfigured, getSettings, publicSettings } from "@/lib/settings";
import { BunnySettingsForm } from "@/components/admin/forms";
import { Badge, PageHeader } from "@/components/ui";

export default async function MediaSettingsPage() {
  await requireAdmin();
  const raw = await getSettings();
  const s = publicSettings(raw);
  const on = bunnyConfigured(raw);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="المحتوى" title="إعدادات الفيديو (Bunny Stream)" subtitle="اربط مكتبة Bunny Stream لترفع الفيديوهات من جهازك مباشرة من صفحة الدرس – بروابط موقّعة تنتهي تلقائيًا وعلامة مائية لكل طالب" actions={<Badge tone={on ? "success" : "warning"}>{on ? "مفعّل" : "غير مفعّل"}</Badge>} />
      <section className="card p-6"><BunnySettingsForm values={{ bunny_library_id: s.bunny_library_id, bunny_cdn_hostname: s.bunny_cdn_hostname }} maskedKey={s.bunny_api_key} /></section>
      <section className="card p-6">
        <h2 className="flex items-center gap-2 font-amin text-base font-bold text-slate-900"><Clapperboard className="size-5 text-brand-500" /> خطوات التفعيل (5 دقائق)</h2>
        <ol className="mt-3 list-inside list-decimal space-y-1 font-taj text-sm leading-7 text-slate-600">
          <li>أنشئ حسابًا على <span dir="ltr">bunny.net</span> ثم من القائمة اختر <b>Stream → Add Video Library</b>.</li>
          <li>افتح المكتبة → <b>API</b> وانسخ <b>Library ID</b> و<b>API Key</b> وضعهما هنا.</li>
          <li>من <b>Security</b> فعّل <b>Token Authentication</b> وانسخ المفتاح إلى متغير البيئة <code dir="ltr">BUNNY_TOKEN_AUTH_KEY</code> في Vercel (لتوقيع روابط التشغيل وانتهائها خلال 3 ساعات).</li>
          <li>من <b>Security → Allowed Referrers</b> أضف دومين موقعك فقط لمنع التضمين في مواقع أخرى.</li>
          <li>اختياري: <b>Encoding → Watermark</b> لإضافة شعارك على الفيديو نفسه، و<b>CDN Hostname</b> هنا لعرض الصور المصغّرة.</li>
        </ol>
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-6 text-emerald-800"><ShieldCheck className="mt-1 size-4 shrink-0" /> الرفع يتم من متصفحك مباشرة إلى Bunny (TUS قابل للاستئناف حتى 8 جيجابايت) – مفتاح API لا يغادر الخادم أبدًا، والطالب لا يرى رابط الفيديو الحقيقي إطلاقًا.</p>
      </section>
    </div>
  );
}
