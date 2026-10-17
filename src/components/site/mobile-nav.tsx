"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function MobileNav({
  links,
  user,
  logout,
}: {
  links: { href: string; label: string }[];
  user: { name: string; staff: boolean } | null;
  logout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="القائمة"
        onClick={() => setOpen((o) => !o)}
        className="grid size-10 place-items-center rounded-full border-2 border-brand-500 text-brand-600"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full mt-2 rounded-2xl border border-slate-100 bg-white p-4 text-slate-800 shadow-2xl">
          <ul className="space-y-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-4 py-2.5 text-sm font-bold hover:bg-brand-50 hover:text-brand-700">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3">
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setOpen(false)} className="btn btn-primary w-full">مذاكرتي</Link>
                {user.staff && <Link href="/admin" onClick={() => setOpen(false)} className="btn btn-outline w-full">لوحة الإدارة</Link>}
                <form action={logout}><button className="btn btn-danger w-full">تسجيل خروج</button></form>
              </>
            ) : (
              <>
                <Link href="/register" onClick={() => setOpen(false)} className="btn btn-primary w-full">حساب جديد</Link>
                <Link href="/login" onClick={() => setOpen(false)} className="btn btn-outline w-full">تسجيل الدخول</Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
