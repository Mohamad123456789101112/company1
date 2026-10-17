import Link from "next/link";
import { AtomMark } from "@/components/site/logo";

export default function NotFound() {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 text-center font-amin">
      <div className="dots-bg absolute inset-0 opacity-60" />
      <div className="relative">
        <AtomMark className="mx-auto size-24" />
        <p className="mt-6 text-8xl font-bold leading-none text-brand-500">404</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">الصفحة غير موجودة</h1>
        <p className="mt-2 font-taj text-sm text-slate-500">يبدو أن الرابط غير صحيح أو تم نقل الصفحة.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/" className="btn btn-primary rounded-md">الرئيسية</Link>
          <Link href="/courses" className="btn btn-outline rounded-md">الكورسات</Link>
        </div>
      </div>
    </div>
  );
}
