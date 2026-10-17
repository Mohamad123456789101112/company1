import { requireTeacherAdmin } from "@/lib/auth";
import { getSupportSettings } from "@/lib/support";
import { SupportForm } from "@/components/admin/forms";
import { PageHeader } from "@/components/ui";

export default async function SupportPage() {
  await requireTeacherAdmin();
  const values = await getSupportSettings();
  return (
    <div>
      <PageHeader eyebrow="التواصل" title="زر الدعم العائم" subtitle="إظهار/إخفاء الزر، واختيار واتساب أو تيليجرام، وأرقام السكرتارية ورسالة الترحيب" />
      <SupportForm values={values} />
    </div>
  );
}
