import { requireAdmin } from "@/lib/auth";
import { getSettings, publicSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/forms";
import { PageHeader } from "@/components/ui";

export default async function SettingsPage() {
  await requireAdmin();
  const values = publicSettings(await getSettings());
  return (
    <div>
      <PageHeader eyebrow="الإدارة" title="إعدادات المنصة" subtitle="الهوية، أرقام التواصل، طرق الدفع، وسياسات الأمان – تنعكس فورًا على الموقع" />
      <SettingsForm values={values} />
    </div>
  );
}
