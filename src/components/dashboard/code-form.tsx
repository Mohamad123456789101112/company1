"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, KeyRound, Sparkles } from "lucide-react";
import { redeemCenterCodeAction } from "@/actions/student";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";

export function CenterCodeForm() {
  const [state, action] = useActionState(redeemCenterCodeAction, null);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.ok && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <p className="flex items-center gap-2 text-sm font-bold"><Sparkles className="size-4" /> {state.message}</p>
          {state.href && (
            <Link href={state.href} className="btn btn-success mt-3 rounded-xl">ابدأ المذاكرة الآن <ArrowLeft className="size-4" /></Link>
          )}
        </div>
      )}
      <Field label="كود السنتر" name="code" hint="مثال: UN-XXXX-XXXX-XXXX – الكود يُستخدم مرة واحدة فقط">
        <Input id="code" name="code" required minLength={8} maxLength={32} placeholder="XX-XXXX-XXXX-XXXX" dir="ltr" className="text-center font-mono text-lg uppercase tracking-[0.3em]" autoComplete="off" autoCapitalize="characters" />
      </Field>
      <SubmitButton className="btn btn-primary shine w-full py-3.5 text-base" pendingText="جارٍ التحقق من الكود...">
        <KeyRound className="size-5" /> تفعيل الكود
      </SubmitButton>
    </form>
  );
}
