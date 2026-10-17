import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { CheckCircle2, Quote, ShieldCheck } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { Logo } from "@/components/site/logo";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Half-page auth layout: emerald picture panel (teacher cut-out) + clean white form panel.
 * The whole block (form box + side picture) is sized to 90% of the screen width.
 */
export async function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const s = await getSettings();
  const [first, ...rest] = title.split(" ");
  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-[90%] max-w-[1500px] flex-col gap-4 py-3 sm:gap-6 sm:py-6 lg:flex-row-reverse lg:gap-6">
      <div className="min-w-0 lg:basis-1/2">
        <div className="relative h-56 w-full overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 sm:h-72 lg:h-full">
          <div className="grid-bg absolute inset-0 opacity-30" />
          <div className="pointer-events-none absolute -left-20 top-10 size-72 rounded-full bg-peach-300/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-10 size-64 rounded-full bg-white/10 blur-3xl" />

          {/* top bar */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4 sm:p-6">
            <Logo siteName={s.site_name} teacherName={s.teacher_name} light />
            <Link href="/" className="rounded-xl border-2 border-white/80 px-4 py-1.5 font-amin text-sm font-bold text-white backdrop-blur transition hover:bg-white hover:text-brand-700">الرئيسية</Link>
          </div>

          {/* motivational quote card (top) */}
          <div className="absolute inset-x-4 top-20 z-20 sm:inset-x-6 sm:top-24 lg:inset-x-10 lg:top-28">
            <div className="relative mx-auto max-w-xl rounded-2xl border border-white/25 bg-white/15 p-4 text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] backdrop-blur-md sm:p-5">
              <Quote className="absolute -top-3 right-4 size-7 rounded-full bg-peach-400 p-1 text-white shadow" />
              <p className="font-amin text-sm font-bold leading-7 sm:text-base lg:text-lg">“{s.auth_quote}”</p>
              <p className="mt-2 text-[11px] font-bold text-peach-200 sm:text-xs">— {s.auth_quote_author}</p>
              <span className="absolute -bottom-2 right-10 size-4 rotate-45 border-b border-r border-white/25 bg-white/15 backdrop-blur-md" />
            </div>
          </div>

          {/* teacher photo (bottom) */}
          <div className="absolute inset-x-0 bottom-0 flex h-[62%] items-end justify-center px-6 sm:h-[60%] lg:h-[58%]">
            <div className="relative h-full w-[78%] max-w-sm overflow-hidden rounded-t-[2.25rem] border-4 border-b-0 border-white/75 shadow-2xl">
              <Image src={s.img_auth || "/images/teacher-about.jpg"} alt={s.teacher_name} width={928} height={1152} priority sizes="(min-width: 1024px) 45vw, 100vw" unoptimized={s.img_auth.startsWith("/api/")} className="h-full w-full object-cover object-top" />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-brand-900/60 to-transparent" />
          <div className="absolute bottom-4 right-6 z-20 hidden items-center gap-2 lg:flex">
            {["حصص فيديو محمية", "امتحانات آمنة", "متابعة لولي الأمر"].map((t) => (
              <span key={t} className="flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-3 py-1 font-taj text-[11px] text-white backdrop-blur"><CheckCircle2 className="size-3.5" /> {t}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative flex min-h-full items-center justify-center rounded-3xl border border-lav-200 bg-white text-slate-900 shadow-[0_10px_40px_-20px_rgba(59,39,134,0.2)] lg:basis-1/2">
        <div className="absolute left-4 top-4"><ThemeToggle size="sm" /></div>
        <div className="relative flex w-[92%] flex-col justify-center space-y-6 py-8 font-taj sm:w-4/5 sm:space-y-7 sm:py-10">
          <div className="relative text-center font-amin text-2xl font-bold">
            <span>{first} </span>
            <span className="text-brand-600">{rest.join(" ")}</span>
          </div>
          <p className="text-center text-sm text-slate-500">{subtitle}</p>
          <div>{children}</div>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400"><ShieldCheck className="size-3.5 text-brand-500" /> بياناتك مشفرة ومحمية بحد أقصى للمحاولات</p>
        </div>
      </div>
    </div>
  );
}
