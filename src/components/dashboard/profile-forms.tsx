"use client";

import { useActionState } from "react";
import { changePasswordAction, updateProfileAction } from "@/actions/auth";
import { Field, FormMessage, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { GRADES, GRADE_KEYS } from "@/lib/utils";

export function ProfileForm({ user }: { user: { name: string; phone: string | null; parentPhone: string | null; grade: string | null; governorate: string | null; email: string } }) {
  const [state, action] = useActionState(updateProfileAction, null);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الاسم بالكامل" name="name" error={e.name}><Input id="name" name="name" required defaultValue={user.name} minLength={3} maxLength={60} /></Field>
        <Field label="البريد الإلكتروني" name="email" hint="لا يمكن تغيير البريد"><Input id="email" value={user.email} disabled dir="ltr" /></Field>
        <Field label="رقم هاتف الطالب" name="phone" error={e.phone}><Input id="phone" name="phone" required pattern="01[0125][0-9]{8}" defaultValue={user.phone ?? ""} dir="ltr" /></Field>
        <Field label="رقم ولي الأمر" name="parentPhone" error={e.parentPhone}><Input id="parentPhone" name="parentPhone" required pattern="01[0125][0-9]{8}" defaultValue={user.parentPhone ?? ""} dir="ltr" /></Field>
        <Field label="الصف الدراسي" name="grade" error={e.grade}>
          <Select id="grade" name="grade" required defaultValue={user.grade ?? ""}>
            <option value="" disabled>اختر الصف</option>
            {GRADE_KEYS.map((g) => <option key={g} value={g}>{GRADES[g].label}</option>)}
          </Select>
        </Field>
        <Field label="المحافظة" name="governorate"><Input id="governorate" name="governorate" defaultValue={user.governorate ?? ""} maxLength={40} /></Field>
      </div>
      <SubmitButton pendingText="جارٍ الحفظ...">حفظ التغييرات</SubmitButton>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action] = useActionState(changePasswordAction, null);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      {hasPassword ? (
        <Field label="كلمة المرور الحالية" name="currentPassword" error={e.currentPassword}><Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" dir="ltr" /></Field>
      ) : (
        <p className="text-xs text-slate-500">حسابك مسجل عبر Google. يمكنك تعيين كلمة مرور لتسجيل الدخول بالبريد أيضًا.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="كلمة المرور الجديدة" name="newPassword" error={e.newPassword} hint="8 أحرف على الأقل، حروف وأرقام"><Input id="newPassword" name="newPassword" type="password" required minLength={8} autoComplete="new-password" dir="ltr" /></Field>
        <Field label="تأكيد كلمة المرور" name="confirmPassword" error={e.confirmPassword}><Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" dir="ltr" /></Field>
      </div>
      <SubmitButton className="btn btn-accent" pendingText="جارٍ التغيير...">{hasPassword ? "تغيير كلمة المرور" : "تعيين كلمة المرور"}</SubmitButton>
    </form>
  );
}
