"use client";

import { useActionState } from "react";
import { contactAction } from "@/actions/student";
import { Field, FormMessage, Input, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";

export function ContactForm() {
  const [state, action] = useActionState(contactAction, null);
  return (
    <form action={action} className="card space-y-4 p-6">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الاسم" name="name">
          <Input id="name" name="name" required minLength={3} maxLength={60} placeholder="اسمك بالكامل" />
        </Field>
        <Field label="رقم الهاتف" name="phone">
          <Input id="phone" name="phone" required inputMode="numeric" pattern="01[0125][0-9]{8}" placeholder="01xxxxxxxxx" dir="ltr" className="text-right" />
        </Field>
      </div>
      <Field label="رسالتك" name="message">
        <Textarea id="message" name="message" required minLength={10} maxLength={1000} placeholder="اكتب استفسارك هنا..." />
      </Field>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <SubmitButton className="btn btn-primary w-full" pendingText="جارٍ الإرسال...">إرسال الرسالة</SubmitButton>
    </form>
  );
}
