import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { CheckCircle2, Quote, ShieldCheck } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { Logo } from "@/components/site/logo";
import { ThemeToggle } from "@/components/theme-toggle";

/** Shared, full-height split layout for the login and registration pages.
 * Tablet (768–1024px): login container is 90% wide, register is 80% wide. */
export async function AuthShell({ title, subtitle, children, variant = "login", image }: { title: string; subtitle: string; children: ReactNode; variant?: "login" | "register"; image?: string }) {
  const s = await getSettings();
  const authImage = image || s.img_auth || "/images/teacher-about.jpg";
  const tabletWidth = variant === "register" ? "md:w-[80%] lg:w-[90%]" : "md:w-[90%]";
  const [first, ...rest] = title.split(" ");

  return (
    <main className="relative min-h-svh bg-lav-50 py-3 sm:py-6">
      <div className="pointer-events-none absolute -left-28 top-20 size-72 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 size-72 rounded-full bg-peach-200/35 blur-3xl" />

      <div className={`relative z-10 mx-auto grid min-h-[calc(100svh-1.5rem)] w-[92%] max-w-[1500px] grid-cols-1 gap-3 sm:min-h-[calc(100svh-3rem)] sm:w-[90%] sm:gap-6 lg:grid-cols-2 ${tabletWidth}`}>
        <section aria-label="رسالة المنصة" className="relative isolate min-h-[19rem] overflow-hidden rounded-3xl bg-brand-900 shadow-[0_24px_70px_-28px_rgba(59,39,134,0.55)] sm:min-h-[24rem] lg:min-h-[calc(100svh-3rem)]">
          <Image
            src={authImage}
            alt={s.teacher_name}
            fill
            priority
            sizes="(min-width: 1024px) 45vw, 100vw"
            unoptimized={authImage.startsWith("/api/")}
            className="object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-tomato-950/65 via-tomato-950/25 to-tomato-950/65" />
          <div className="grid-bg pointer-events-none absolute inset-0 opacity-25" />
          <div className="pointer-events-none absolute -left-20 top-24 size-72 rounded-full bg-peach-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-10 size-64 rounded-full bg-brand-300/20 blur-3xl" />

          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 p-4 sm:p-6">
            <Logo siteName={s.site_name} teacherName={s.teacher_name} light logoUrl={s.site_logo || undefined} />
            <Link href="/" className="shrink-0 rounded-xl border border-white/75 bg-white/10 px-3.5 py-2 font-amin text-sm font-bold text-white backdrop-blur-md transition hover:bg-white hover:text-brand-700 sm:px-4">
              الرئيسية
            </Link>
          </div>

          <div className="absolute inset-x-4 top-[5.5rem] z-20 sm:inset-x-6 sm:top-24 lg:inset-x-9 lg:top-28">
            <div className="relative mx-auto max-w-xl rounded-2xl border border-white/30 bg-tomato-950/50 p-4 text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-5">
              <Quote className="absolute -top-3 right-4 size-7 rounded-full bg-peach-400 p-1 text-white shadow" aria-hidden="true" />
              <p className="font-amin text-sm font-bold leading-7 sm:text-base lg:text-lg">“{s.auth_quote}”</p>
              <p className="mt-2 text-[11px] font-bold text-peach-200 sm:text-xs">— {s.auth_quote_author}</p>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 hidden items-center justify-center gap-2 px-5 pb-5 lg:flex">
            {["حصص فيديو محمية", "امتحانات آمنة", "متابعة لولي الأمر"].map((text) => (
              <span key={text} className="flex items-center gap-1.5 rounded-full border border-white/25 bg-tomato-950/45 px-3 py-1.5 font-taj text-[11px] text-white shadow-sm backdrop-blur-md">
                <CheckCircle2 className="size-3.5 text-peach-200" aria-hidden="true" /> {text}
              </span>
            ))}
          </div>
        </section>

        <section className="relative flex min-w-0 items-center justify-center rounded-3xl border border-lav-200 bg-white text-slate-900 shadow-[0_10px_40px_-20px_rgba(59,39,134,0.2)] lg:min-h-[calc(100svh-3rem)]">
          <div className="absolute left-4 top-4 z-10"><ThemeToggle size="sm" /></div>
          <div className="relative flex w-[92%] max-w-[600px] flex-col justify-center space-y-6 py-10 font-taj sm:w-4/5 sm:space-y-7 sm:py-12">
            <div className="text-center font-amin text-2xl font-bold">
              <span>{first} </span>
              <span className="text-brand-600">{rest.join(" ")}</span>
            </div>
            <p className="text-center text-sm leading-6 text-slate-500">{subtitle}</p>
            <div>{children}</div>
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400"><ShieldCheck className="size-3.5 text-brand-500" aria-hidden="true" /> بياناتك مشفرة ومحمية بحد أقصى للمحاولات</p>
          </div>
        </section>
      </div>
    </main>
  );
}
