"use client";

import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";
import { submitPaymentAction } from "@/actions/student";
import { Field, FormMessage, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { Uploader } from "@/components/uploader";

export function CheckoutForm({ courseId, defaultPhone }: { courseId: string; defaultPhone?: string | null }) {
  const [state, action] = useActionState(submitPaymentAction, null);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-5">
      <FormMessage state={state} />
      <input type="hidden" name="courseId" value={courseId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الرقم الذي حوّلت منه" name="senderPhone" error={e.senderPhone}>
          <Input id="senderPhone" name="senderPhone" required inputMode="numeric" pattern="01[0125][0-9]{8}" placeholder="01xxxxxxxxx" dir="ltr" defaultValue={defaultPhone ?? ""} />
        </Field>
        <Field label="رقم العملية (المرجع)" name="reference" error={e.reference} hint="موجود في رسالة تأكيد التحويل من فودافون كاش">
          <Input id="reference" name="reference" required minLength={4} maxLength={40} placeholder="مثال: 5471029384" dir="ltr" autoComplete="off" />
        </Field>
      </div>
      <Uploader name="receiptFileId" kind="receipt" label="صورة إيصال التحويل" hint="لقطة شاشة واضحة لرسالة/شاشة نجاح التحويل" />
      {e.receiptFileId && <p className="-mt-3 text-xs font-bold text-rose-600">{e.receiptFileId}</p>}
      <label className="flex items-start gap-3 rounded-xl border border-lav-200 bg-lav-50 px-3 py-2.5 text-xs leading-6 text-slate-600">
        <input type="checkbox" name="agree" required className="mt-1 size-4 accent-[#7c5cff]" />
        <span>أقر بأن بيانات التحويل صحيحة وأوافق على <a href="/terms" target="_blank" className="font-bold text-brand-600 hover:underline">سياسة الاسترجاع</a>. التلاعب في الإيصالات يؤدي لحظر الحساب نهائيًا.</span>
      </label>
      <SubmitButton className="btn btn-primary shine w-full py-3.5 text-base" pendingText="جارٍ إرسال الطلب والتحقق...">
        <ShieldCheck className="size-5" /> تأكيد الدفع وإرسال الطلب
      </SubmitButton>
    </form>
  );
}
