import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { CompleteProfileForm } from "@/components/auth/forms";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "إكمال البيانات" };
export const dynamic = "force-dynamic";

export default async function CompleteProfilePage() {
  const user = await requireUser("/complete-profile");
  if (user.phone && user.parentPhone && user.grade) redirect("/dashboard");

  return (
    <AuthShell title={`أهلًا ${user.name.split(" ")[0]} 👋`} subtitle="خطوة أخيرة: أكمل بياناتك عشان نقدر نتابع معاك ومع ولي أمرك">
      <CompleteProfileForm defaults={{ phone: user.phone, parentPhone: user.parentPhone, grade: user.grade }} />
    </AuthShell>
  );
}
