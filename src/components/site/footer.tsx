import Link from "next/link";
import { Code2, ShieldCheck } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "./logo";
import { FacebookIcon, TelegramIcon, TikTokIcon, InstagramIcon, YoutubeIcon, WhatsAppIcon } from "@/components/icons";

export async function Footer() {
  const [s, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const year = new Date().getFullYear();
  const social = [
    { href: s.facebook, label: "فيسبوك", Icon: FacebookIcon },
    { href: s.instagram, label: "انستجرام", Icon: InstagramIcon },
    { href: s.tiktok, label: "تيك توك", Icon: TikTokIcon },
    { href: s.youtube, label: "يوتيوب", Icon: YoutubeIcon },
    { href: s.telegram, label: "تيليجرام", Icon: TelegramIcon },
  ].filter((x) => x.href);

  return (
    <footer className="relative z-20 mt-10 border-t border-lav-200 bg-lav-50 font-taj text-slate-800">
      <div className="h-1 w-full bg-gradient-to-l from-brand-500 via-peach-400 to-brand-300" />
      <div className="container-x flex w-full flex-col items-start gap-10 py-12 md:flex-row md:items-start">
        <div className="flex h-full w-full min-w-0 flex-col items-start gap-6 md:w-1/2">
          <Logo siteName={s.site_name} teacherName={s.teacher_name} />
          <p className="max-w-md text-sm leading-7 text-slate-500">{s.footer_text}</p>
          <div className="flex gap-2">
            {social.map(({ href, label, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className="grid size-10 place-items-center rounded-xl border border-lav-200 bg-white text-slate-500 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600">
                <Icon className="size-4" />
              </a>
            ))}
            {s.whatsapp && (
              <a href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label="واتساب" title="واتساب" className="grid size-10 place-items-center rounded-xl border border-lav-200 bg-white text-slate-500 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600">
                <WhatsAppIcon className="size-4" />
              </a>
            )}
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-8 md:w-1/2 md:grid-cols-3">
          <div className="flex flex-col gap-4">
            <div className="font-bold text-brand-600">الصفحات</div>
            <div className="flex flex-col gap-1.5 text-sm">
              <Link href="/" className="hover:text-brand-600">الرئيسية</Link>
              <Link href="/courses" className="hover:text-brand-600">الكورسات</Link>
              <Link href="/#pricing" className="hover:text-brand-600">خطط الاشتراك</Link>
              <Link href="/#testimonials" className="hover:text-brand-600">آراء الطلاب</Link>
              {!user && (
                <>
                  <Link href="/register" className="hover:text-brand-600">انشاء حساب جديد</Link>
                  <Link href="/login" className="hover:text-brand-600">تسجيل الدخول</Link>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="font-bold text-brand-600">السوشيال ميديا</div>
            <div className="flex flex-col gap-1.5 text-sm">
              {social.map(({ href, label, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-brand-600">
                  <Icon className="size-4" /> <span>{label}</span>
                </a>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="font-bold text-brand-600">الدعم</div>
            <div className="flex flex-col gap-1.5 text-sm">
              {s.phone && <a href={`tel:${s.phone}`} className="hover:text-brand-600" dir="ltr">{s.phone}</a>}
              {s.whatsapp && <a href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-brand-600">واتساب الدعم</a>}
              {!s.phone && !s.whatsapp && <span className="text-slate-400">سيتم إضافة بيانات التواصل قريبًا</span>}
              <Link href="/privacy" className="hover:text-brand-600">سياسة الخصوصية</Link>
              <Link href="/terms" className="hover:text-brand-600">شروط الاستخدام</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-lav-200">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-5 text-xs text-slate-500 md:flex-row">
          <p className="font-bold">جميع الحقوق محفوظة © {year} – {s.site_name}</p>
          <p className="flex items-center gap-1.5">
            <Code2 className="size-3.5 text-brand-500" />
            تصميم وتطوير:{" "}
            {s.developer_url ? (
              <a href={s.developer_url} target="_blank" rel="noopener noreferrer" className="font-bold text-brand-600 hover:text-brand-700">{s.developer_name}</a>
            ) : (
              <span className="font-bold text-brand-600">{s.developer_name}</span>
            )}
          </p>
          <p className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-brand-500" /> منصة مؤمّنة بالكامل</p>
        </div>
      </div>
    </footer>
  );
}
