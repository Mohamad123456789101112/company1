"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  Bot,
  ClipboardList,
  CreditCard,
  Database,
  Globe,
  Home,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  MessageSquareQuote,
  PanelRightClose,
  PanelRightOpen,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Ticket,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { AtomMark } from "@/components/site/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui";
import { WhatsAppIcon } from "@/components/icons";
import { cn, timeAgo } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  dashboard: LayoutDashboard,
  book: BookOpen,
  exams: ClipboardList,
  code: Ticket,
  cart: ShoppingBag,
  bell: Bell,
  user: UserCircle,
  megaphone: Megaphone,
  globe: Globe,
  students: Users,
  courses: BookOpen,
  payments: CreditCard,
  ai: Bot,
  messages: MessageSquare,
  audit: ScrollText,
  settings: Settings,
  setup: Database,
  testimonials: MessageSquareQuote,
  shield: ShieldCheck,
  image: ImageIcon,
};

export type ShellNavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number; exact?: boolean; section?: string };
export type ShellNotification = { id: string; title: string; body: string; href: string | null; isRead: boolean; createdAt: string; type: string };

type Props = {
  variant: "student" | "admin";
  brand: { siteName: string; teacherName: string };
  user: { name: string; email: string; avatarUrl: string | null; role: string; subtitle?: string };
  nav: ShellNavItem[];
  notifications: ShellNotification[];
  unread: number;
  whatsapp?: string;
  logout: () => Promise<void>;
  markRead?: () => Promise<void>;
  children: ReactNode;
};

const STORAGE_KEY = "aj-sidebar-collapsed";

function useOutside<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const h = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("touchstart", h);
    };
  }, [onOutside]);
  return ref;
}

/**
 * Responsive dashboard chrome: collapsible right sidebar (RTL), mobile drawer,
 * slim top bar with page title, theme toggle, notifications and the account menu.
 */
export function DashboardShell({ variant, brand, user, nav, notifications, unread, whatsapp, logout, markRead, children }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menu, setMenu] = useState<"none" | "account" | "bell">("none");
  const closeMenu = () => setMenu("none");
  const menuRef = useOutside<HTMLDivElement>(closeMenu);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    setMobileOpen(false);
    setMenu("none");
  }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORAGE_KEY, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  };

  const isActive = (it: ShellNavItem) => (it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + "/"));
  const current = nav.find(isActive);
  const accent = variant === "admin" ? "from-brand-700 to-brand-900" : "from-brand-500 to-brand-700";

  const sections = nav.reduce<Record<string, ShellNavItem[]>>((acc, it) => {
    const k = it.section ?? "";
    (acc[k] ??= []).push(it);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900 dark:bg-[var(--color-surface-0)] dark:text-slate-900">
      {/* mobile overlay */}
      <div className={cn("fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity lg:hidden", mobileOpen ? "opacity-100" : "pointer-events-none opacity-0")} onClick={() => setMobileOpen(false)} aria-hidden="true" />

      {/* sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-72 flex-col border-l border-slate-200/80 bg-white shadow-[0_0_40px_-24px_rgba(15,23,42,0.18)] transition-[transform,width] duration-300 ease-out dark:bg-[var(--color-surface)]",
          mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
          collapsed ? "lg:w-20" : "lg:w-72",
        )}
        aria-label="القائمة الجانبية"
      >
        <div className={cn("flex h-16 items-center border-b border-lav-200 px-4", collapsed ? "lg:justify-center lg:px-0" : "justify-between")}>
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden" title={brand.siteName}>
            <AtomMark className="size-10 shrink-0" />
            <span className={cn("font-amin leading-none transition-opacity", collapsed && "lg:hidden")}>
              <span className="block text-base font-bold text-slate-900">{brand.teacherName.replace(/^م\/\s*/, "")}</span>
              <span className="block text-[10px] font-bold text-brand-600">{variant === "admin" ? "لوحة الإدارة" : "لوحة الطالب"}</span>
            </span>
          </Link>
          <button type="button" onClick={() => setMobileOpen(false)} className="grid size-9 place-items-center rounded-xl text-slate-500 hover:bg-lav-100 lg:hidden" aria-label="إغلاق القائمة">
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {Object.entries(sections).map(([section, items]) => (
            <div key={section || "main"} className="mb-4">
              {section && <p className={cn("mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400", collapsed && "lg:hidden")}>{section}</p>}
              <ul className="space-y-1">
                {items.map((it) => {
                  const Icon = ICONS[it.icon] ?? Home;
                  const active = isActive(it);
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        title={it.label}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition",
                          active ? cn("bg-gradient-to-l text-white shadow-glow", accent) : "text-slate-600 hover:bg-lav-100 hover:text-brand-700",
                          collapsed && "lg:justify-center lg:px-0",
                        )}
                      >
                        <Icon className={cn("size-5 shrink-0", active ? "text-white" : "text-brand-500")} />
                        <span className={cn("flex-1 truncate", collapsed && "lg:hidden")}>{it.label}</span>
                        {it.badge ? (
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black", active ? "bg-white/20 text-white" : "bg-peach-100 text-peach-700", collapsed && "lg:absolute lg:-top-1 lg:left-1 lg:px-1.5")}>{it.badge > 99 ? "99+" : it.badge}</span>
                        ) : null}
                        {collapsed && (
                          <span className="pointer-events-none absolute right-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-white opacity-0 shadow-xl transition group-hover:opacity-100 lg:block">
                            {it.label}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-lav-200 p-3">
          {whatsapp && (
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" title="الدعم عبر واتساب" className={cn("mb-2 flex items-center gap-3 rounded-xl bg-[#25D366]/10 px-3 py-2.5 text-sm font-bold text-[#128C7E] transition hover:bg-[#25D366]/20", collapsed && "lg:justify-center lg:px-0")}>
              <WhatsAppIcon className="size-5 shrink-0" />
              <span className={cn(collapsed && "lg:hidden")}>الدعم الفني</span>
            </a>
          )}
          <button type="button" onClick={toggleCollapsed} className={cn("hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-lav-100 lg:flex", collapsed && "lg:justify-center lg:px-0")} aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}>
            {collapsed ? <PanelRightOpen className="size-5" /> : <PanelRightClose className="size-5" />}
            <span className={cn(collapsed && "lg:hidden")}>طي القائمة</span>
          </button>
        </div>
      </aside>

      {/* content */}
      <div className={cn("flex min-h-screen flex-col transition-[padding] duration-300", collapsed ? "lg:pr-20" : "lg:pr-72")}>
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:bg-[var(--color-surface)]/85">
          <div className="mx-auto flex h-16 w-[90%] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <button type="button" onClick={() => setMobileOpen(true)} className="grid size-10 place-items-center rounded-xl border border-lav-200 text-slate-600 hover:bg-lav-100 lg:hidden" aria-label="فتح القائمة">
                <Menu className="size-5" />
              </button>
              <div className="min-w-0">
                <p className="truncate font-amin text-base font-bold text-slate-900 sm:text-lg">{current?.label ?? (variant === "admin" ? "لوحة الإدارة" : "لوحة الطالب")}</p>
                <p className="hidden truncate text-[11px] text-slate-500 sm:block">{brand.siteName}</p>
              </div>
            </div>

            <div ref={menuRef} className="flex items-center gap-2">
              <ThemeToggle size="sm" />

              {/* notifications */}
              <div className="relative">
                <button type="button" onClick={() => setMenu(menu === "bell" ? "none" : "bell")} className="relative grid size-10 place-items-center rounded-xl border border-lav-200 text-slate-600 transition hover:bg-lav-100" aria-label="الإشعارات">
                  <Bell className="size-5" />
                  {unread > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-peach-500 px-1 text-[10px] font-black text-white ring-2 ring-white">{unread > 9 ? "9+" : unread}</span>}
                </button>
                {menu === "bell" && (
                  <div className="absolute left-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-lav-200 bg-white shadow-2xl dark:bg-[var(--color-surface-2)]">
                    <div className="flex items-center justify-between border-b border-lav-200 px-4 py-3">
                      <p className="text-sm font-bold">الإشعارات</p>
                      {markRead && unread > 0 && (
                        <form action={markRead}>
                          <button className="text-xs font-bold text-brand-600 hover:underline">تحديد الكل كمقروء</button>
                        </form>
                      )}
                    </div>
                    <ul className="max-h-80 divide-y divide-lav-200 overflow-y-auto">
                      {notifications.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-500">لا توجد إشعارات</li>}
                      {notifications.map((n) => (
                        <li key={n.id} className={cn(!n.isRead && "bg-brand-50/60")}>
                          <Link href={n.href ?? "#"} onClick={closeMenu} className="block px-4 py-3 hover:bg-lav-100">
                            <p className="text-sm font-bold text-slate-900">{n.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">{n.body}</p>
                            <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {variant === "student" && (
                      <Link href="/dashboard/notifications" onClick={closeMenu} className="block border-t border-lav-200 px-4 py-2.5 text-center text-xs font-bold text-brand-600 hover:bg-lav-100">كل الإشعارات</Link>
                    )}
                  </div>
                )}
              </div>

              {/* account */}
              <div className="relative">
                <button type="button" onClick={() => setMenu(menu === "account" ? "none" : "account")} className="flex items-center gap-2 rounded-full border border-lav-200 p-0.5 pe-2 transition hover:border-brand-400 sm:pe-3" aria-label="حسابي">
                  <Avatar name={user.name} src={user.avatarUrl} size={34} />
                  <span className="hidden max-w-28 truncate text-sm font-bold text-slate-800 sm:block">{user.name.split(" ")[0]}</span>
                </button>
                {menu === "account" && (
                  <div className="absolute left-0 mt-2 w-64 overflow-hidden rounded-2xl border border-lav-200 bg-white p-2 shadow-2xl dark:bg-[var(--color-surface-2)]">
                    <div className="flex items-center gap-3 px-3 py-2">
                      <Avatar name={user.name} src={user.avatarUrl} size={40} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{user.name}</p>
                        <p className="truncate text-xs text-slate-500">{user.subtitle ?? user.email}</p>
                      </div>
                    </div>
                    <div className="mx-2 my-1 h-px bg-lav-200" />
                    <Link href={variant === "admin" ? "/dashboard/profile" : "/dashboard/profile"} onClick={closeMenu} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-lav-100"><UserCircle className="size-4 text-brand-500" /> حسابي والأجهزة</Link>
                    <Link href="/" onClick={closeMenu} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-lav-100"><Globe className="size-4 text-brand-500" /> الموقع الرئيسي</Link>
                    {user.role !== "student" && (
                      <Link href={variant === "admin" ? "/dashboard" : "/admin"} onClick={closeMenu} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-lav-100">
                        {variant === "admin" ? <LayoutDashboard className="size-4 text-brand-500" /> : <ShieldCheck className="size-4 text-peach-500" />}
                        {variant === "admin" ? "لوحة الطالب" : "لوحة الإدارة"}
                      </Link>
                    )}
                    <div className="mx-2 my-1 h-px bg-lav-200" />
                    <form action={logout}>
                      <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"><LogOut className="size-4" /> تسجيل الخروج</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard content occupies 90% of the available width so tables and
            charts render with full detail – no crowding, no side-scroll. */}
        <main className="mx-auto w-[90%] flex-1 py-4 pb-24 sm:py-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
