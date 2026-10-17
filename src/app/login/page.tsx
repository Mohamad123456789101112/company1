import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/forms";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { isGoogleConfigured } from "@/lib/google";
import { safeRedirectPath } from "@/lib/security";

export const metadata: Metadata = { title: "تسجيل الدخول" };
export const dynamic = "force-dynamic";

const GOOGLE_ERRORS: Record<string, string> = {
  google_not_configured: "تسجيل الدخول عبر Google غير مفعّل بعد. استخدم البريد وكلمة المرور.",
  google_cancelled: "ألغيت تسجيل الدخول عبر Google.",
  google_failed: "تعذر إتمام تسجيل الدخول عبر Google. حاول مرة أخرى.",
  google_state: "انتهت صلاحية الجلسة الأمنية. حاول مرة أخرى.",
  google_unverified: "بريد Google غير مُوثّق. استخدم بريدًا آخر.",
  banned: "تم حظر هذا الحساب. تواصل مع الدعم.",
  rate_limited: "محاولات كثيرة جدًا. حاول لاحقًا.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(isStaff(user) ? "/admin" : "/dashboard");

  const next = typeof sp.next === "string" ? safeRedirectPath(sp.next, "") || undefined : undefined;
  const error = typeof sp.error === "string" ? GOOGLE_ERRORS[sp.error] : undefined;
  const notice = error ?? (sp.reset ? "تم تغيير كلمة المرور، سجّل الدخول بكلمة المرور الجديدة." : undefined);

  return (
    <AuthShell title="أهلًا بعودتك 👋" subtitle="سجّل الدخول للوصول إلى كورساتك وامتحاناتك">
      <LoginForm next={next} googleEnabled={isGoogleConfigured()} notice={notice} />
    </AuthShell>
  );
}
