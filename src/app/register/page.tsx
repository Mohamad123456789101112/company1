import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/forms";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { isGoogleConfigured } from "@/lib/google";
import { getSettings, settingBool } from "@/lib/settings";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "إنشاء حساب جديد" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const [user, s] = await Promise.all([getCurrentUser(), getSettings()]);
  if (user) redirect(isStaff(user) ? "/admin" : "/dashboard");

  return (
    <AuthShell title="أنشئ حسابك الجديد 🚀" subtitle="دقيقة واحدة وتبدأ أول حصة مجانًا" variant="register" image={s.img_register}>
      {settingBool(s.allow_registration) ? (
        <RegisterForm googleEnabled={isGoogleConfigured()} />
      ) : (
        <Alert tone="warning">التسجيل مغلق حاليًا. تواصل مع الإدارة عبر واتساب لإنشاء حساب.</Alert>
      )}
    </AuthShell>
  );
}
