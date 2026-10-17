"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Gift, ShoppingCart } from "lucide-react";
import { enrollFreeAction } from "@/actions/student";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";

export function EnrollButton({ courseId, price, loggedIn, slug }: { courseId: string; price: number; loggedIn: boolean; slug: string }) {
  const [state, action] = useActionState(enrollFreeAction, null);
  if (!loggedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(price === 0 ? `/courses/${slug}` : `/checkout/${slug}`)}`} className="btn btn-primary w-full py-3 text-base">
        سجّل الدخول للاشتراك
      </Link>
    );
  }
  if (price > 0) {
    return (
      <Link href={`/checkout/${slug}`} className="btn btn-primary shine w-full py-3 text-base">
        <ShoppingCart className="size-5" /> اشترك الآن – ادفع بفودافون كاش
      </Link>
    );
  }
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary w-full py-3 text-base" pendingText="جارٍ التفعيل...">
        <Gift className="size-5" /> فعّل الكورس مجانًا
      </SubmitButton>
    </form>
  );
}
