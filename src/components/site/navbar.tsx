import Link from "next/link";
import { Home, LayoutDashboard, LogOut, ShieldCheck, UserCircle } from "lucide-react";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { logoutAction } from "@/actions/auth";
import { Avatar } from "@/components/ui";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export const NAV_LINKS = [
  { href: "/", label: "الرئيسية" },
  { href: "/courses", label: "الكورسات" },
  { href: "/#why", label: "ليه تشترك معانا؟" },
  { href: "/#pricing", label: "الباقات" },
  { href: "/#testimonials", label: "آراء الطلاب" },
  { href: "/#about", label: "عن المدرس" },
];

/** Floating white navbar with a soft shadow and emerald accents. */
export async function Navbar() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);

  return (
    <div className="pointer-events-none sticky top-0 z-50 h-20">
      {settings.announcement_bar && (
        <div className="pointer-events-auto bg-brand-600 py-1 text-center text-xs font-bold text-white">{settings.announcement_bar}</div>
      )}
      <nav className="pointer-events-auto relative mx-4 mt-4 flex h-16 items-center justify-between rounded-full border border-lav-200 bg-white/95 px-4 shadow-[0_8px_30px_-12px_rgba(59,39,134,0.22)] backdrop-blur md:mx-[8vw] md:rounded-2xl md:px-6 lg:mx-[6vw] lg:px-8 2xl:mx-auto 2xl:max-w-7xl font-amin">
        <Logo siteName={settings.site_name} teacherName={settings.teacher_name} />

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-brand-50 hover:text-brand-700">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {user ? (
            <>
              <details className="relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border-2 border-slate-200 p-0.5 pe-3 transition hover:border-brand-500">
                  <Avatar name={user.name} src={user.avatarUrl} size={34} />
                  <span className="max-w-28 truncate text-sm font-bold text-slate-800">{user.name.split(" ")[0]}</span>
                </summary>
                <div className="absolute left-0 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl font-sans">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-bold text-slate-900">اهلًا {user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <div className="mx-3 my-1 h-1 rounded-md bg-slate-100" />
                  <Link href="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><Home className="size-4 text-brand-500" /> الصفحة الرئيسية</Link>
                  <Link href="/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><LayoutDashboard className="size-4 text-brand-500" /> مذاكرتي</Link>
                  <Link href="/dashboard/profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><UserCircle className="size-4 text-brand-500" /> حسابي</Link>
                  {isStaff(user) && (
                    <Link href="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><ShieldCheck className="size-4 text-peach-500" /> لوحة الإدارة</Link>
                  )}
                  <div className="mx-3 my-1 h-px bg-slate-200" />
                  <form action={logoutAction}>
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"><LogOut className="size-4" /> تسجيل خروج</button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              <Link href="/register" className="btn btn-primary rounded-xl px-6">حساب جديد</Link>
              <Link href="/login" className="btn btn-outline rounded-xl px-6">تسجيل الدخول</Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle size="sm" />
          <MobileNav links={NAV_LINKS} user={user ? { name: user.name, staff: isStaff(user) } : null} logout={logoutAction} />
        </div>
      </nav>
    </div>
  );
}
