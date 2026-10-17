"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { completeProfileAction, loginAction, registerAction } from "@/actions/auth";
import { Field, FormMessage, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { GoogleIcon } from "@/components/icons";
import { GRADES, GRADE_KEYS } from "@/lib/utils";

function PasswordInput(props: { name: string; placeholder?: string; autoComplete?: string; minLength?: number }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={props.name} name={props.name} type={show ? "text" : "password"} required maxLength={72} minLength={props.minLength} placeholder={props.placeholder ?? "••••••••"} autoComplete={props.autoComplete} className="pl-11" dir="ltr" />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900" aria-label="إظهار كلمة المرور">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function GoogleButton({ enabled, next }: { enabled: boolean; next?: string }) {
  const href = `/api/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  if (!enabled) {
    return (
      <div className="btn w-full cursor-not-allowed border-lav-300 bg-white py-3 text-slate-500 opacity-70" title="أضف GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET في متغيرات البيئة لتفعيل الدخول عبر Google">
        <GoogleIcon className="size-5" /> الدخول عبر Google (غير مفعّل بعد)
      </div>
    );
  }
  return (
    <a href={href} className="btn w-full border-lav-300 bg-white py-3 text-slate-800 shadow-sm hover:border-brand-400 hover:bg-brand-50/40 hover:text-slate-900 active:scale-[0.99]">
      <GoogleIcon className="size-5" /> المتابعة بحساب Google
    </a>
  );
}

function Divider({ label = "أو" }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-xs font-bold text-slate-400">
      <span className="h-px flex-1 bg-lav-300" /> {label} <span className="h-px flex-1 bg-lav-300" />
    </div>
  );
}

export function LoginForm({ next, googleEnabled, notice }: { next?: string; googleEnabled: boolean; notice?: string }) {
  const [state, action] = useActionState(loginAction, null);
  return (
    <div>
      <form action={action} className="space-y-4">
        {notice && !state?.error && <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">{notice}</div>}
        <FormMessage state={state} />
        {next && <input type="hidden" name="next" value={next} />}
        <Field label="البريد الإلكتروني" name="email">
          <Input id="email" name="email" type="email" required autoComplete="email" placeholder="example@gmail.com" dir="ltr" />
        </Field>
        <Field label="كلمة المرور" name="password">
          <PasswordInput name="password" autoComplete="current-password" />
        </Field>
        <SubmitButton className="btn btn-primary w-full py-3" pendingText="جارٍ التحقق...">تسجيل الدخول</SubmitButton>
      </form>
      <Divider label="أو تابع باستخدام" />
      <GoogleButton enabled={googleEnabled} next={next} />
      <p className="mt-6 text-center text-sm text-slate-500">
        ليس لديك حساب؟ <Link href="/register" className="font-bold text-brand-600 hover:underline">أنشئ حسابًا الآن</Link>
      </p>
      <p className="mt-2 text-center text-xs text-slate-500">نسيت كلمة المرور؟ تواصل مع الدعم برقم الهاتف المسجل.</p>
    </div>
  );
}

function GradeSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <Select id="grade" name="grade" required defaultValue={defaultValue ?? ""}>
      <option value="" disabled>اختر الصف الدراسي</option>
      {GRADE_KEYS.map((g) => (
        <option key={g} value={g}>{GRADES[g].label}</option>
      ))}
    </Select>
  );
}

const GOVERNORATES = ["القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "الشرقية", "القليوبية", "كفر الشيخ", "الغربية", "المنوفية", "البحيرة", "الإسماعيلية", "بورسعيد", "السويس", "دمياط", "الفيوم", "بني سويف", "المنيا", "أسيوط", "سوهاج", "قنا", "الأقصر", "أسوان", "البحر الأحمر", "الوادي الجديد", "مطروح", "شمال سيناء", "جنوب سيناء"];

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, action] = useActionState(registerAction, null);
  const e = state?.errors ?? {};
  return (
    <div>
      <form action={action} className="space-y-4">
        <FormMessage state={state} />
        <Field label="الاسم بالكامل" name="name" error={e.name}>
          <Input id="name" name="name" required minLength={3} maxLength={60} placeholder="الاسم ثلاثي" autoComplete="name" />
        </Field>
        <Field label="البريد الإلكتروني" name="email" error={e.email}>
          <Input id="email" name="email" type="email" required autoComplete="email" placeholder="example@gmail.com" dir="ltr" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="رقم هاتف الطالب" name="phone" error={e.phone}>
            <Input id="phone" name="phone" required inputMode="numeric" pattern="01[0125][0-9]{8}" placeholder="01xxxxxxxxx" dir="ltr" autoComplete="tel" />
          </Field>
          <Field label="رقم هاتف ولي الأمر" name="parentPhone" error={e.parentPhone}>
            <Input id="parentPhone" name="parentPhone" required inputMode="numeric" pattern="01[0125][0-9]{8}" placeholder="01xxxxxxxxx" dir="ltr" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الصف الدراسي" name="grade" error={e.grade}>
            <GradeSelect />
          </Field>
          <Field label="المحافظة" name="governorate" error={e.governorate}>
            <Select id="governorate" name="governorate" defaultValue="">
              <option value="">اختر المحافظة</option>
              {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="كلمة المرور" name="password" error={e.password} hint="8 أحرف على الأقل وتحتوي على حروف وأرقام">
            <PasswordInput name="password" autoComplete="new-password" minLength={8} />
          </Field>
          <Field label="تأكيد كلمة المرور" name="confirmPassword" error={e.confirmPassword}>
            <PasswordInput name="confirmPassword" autoComplete="new-password" minLength={8} />
          </Field>
        </div>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <p className="text-xs leading-6 text-slate-500">
          بإنشاء الحساب فإنك توافق على <Link href="/terms" className="text-brand-600 hover:underline">شروط الاستخدام</Link> و<Link href="/privacy" className="text-brand-600 hover:underline">سياسة الخصوصية</Link>.
        </p>
        <SubmitButton className="btn btn-primary w-full py-3" pendingText="جارٍ إنشاء الحساب...">إنشاء الحساب</SubmitButton>
      </form>
      <Divider label="أو سجّل باستخدام" />
      <GoogleButton enabled={googleEnabled} />
      <p className="mt-6 text-center text-sm text-slate-500">
        لديك حساب بالفعل؟ <Link href="/login" className="font-bold text-brand-600 hover:underline">سجّل الدخول</Link>
      </p>
    </div>
  );
}

export function CompleteProfileForm({ defaults }: { defaults: { phone?: string | null; parentPhone?: string | null; grade?: string | null } }) {
  const [state, action] = useActionState(completeProfileAction, null);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="رقم هاتف الطالب" name="phone" error={e.phone}>
          <Input id="phone" name="phone" required inputMode="numeric" pattern="01[0125][0-9]{8}" placeholder="01xxxxxxxxx" dir="ltr" defaultValue={defaults.phone ?? ""} />
        </Field>
        <Field label="رقم هاتف ولي الأمر" name="parentPhone" error={e.parentPhone}>
          <Input id="parentPhone" name="parentPhone" required inputMode="numeric" pattern="01[0125][0-9]{8}" placeholder="01xxxxxxxxx" dir="ltr" defaultValue={defaults.parentPhone ?? ""} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الصف الدراسي" name="grade" error={e.grade}>
          <GradeSelect defaultValue={defaults.grade ?? undefined} />
        </Field>
        <Field label="المحافظة" name="governorate">
          <Select id="governorate" name="governorate" defaultValue="">
            <option value="">اختر المحافظة</option>
            {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
          </Select>
        </Field>
      </div>
      <SubmitButton className="btn btn-primary w-full py-3" pendingText="جارٍ الحفظ...">حفظ والمتابعة</SubmitButton>
    </form>
  );
}
