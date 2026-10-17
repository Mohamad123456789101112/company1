import { ImageIcon } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { SiteImagesForm } from "@/components/admin/forms";
import { PageHeader } from "@/components/ui";

export default async function SiteImagesPage() {
  await requireSuperAdmin();
  const s = await getSettings();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="المظهر" title="صور الموقع والهوية" subtitle="صورة الهيدر، وصورة «عن المستر»، وصور الأقسام الثلاثة، وصور صفحات الدخول، واللوجو وأيقونة المتصفح – بدون أي كود" />
      <section className="card p-6">
        <p className="mb-5 flex items-center gap-2 text-xs text-slate-500"><ImageIcon className="size-4 text-brand-500" /> الصور المرفوعة تُحفظ على المنصة وتظهر فورًا في الصفحة الرئيسية وصفحات الدخول.</p>
        <SiteImagesForm values={{ img_hero: s.img_hero, img_about: s.img_about, img_feature_1: s.img_feature_1, img_feature_2: s.img_feature_2, img_feature_3: s.img_feature_3, img_auth: s.img_auth, img_login: s.img_login, img_register: s.img_register, site_logo: s.site_logo, site_favicon: s.site_favicon, auth_quote: s.auth_quote, auth_quote_author: s.auth_quote_author }} />
      </section>
    </div>
  );
}
