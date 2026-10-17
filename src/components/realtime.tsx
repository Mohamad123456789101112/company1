"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, X } from "lucide-react";

type Toast = { id: string; title: string; body: string; href: string | null };

/**
 * Live updates: opens an SSE connection and refreshes the current server-rendered
 * route the moment something changes for this user (payment approved, course
 * unlocked, exam scheduled, new notification). Also shows an in-app toast.
 */
export function RealtimeListener({ scope = "student" }: { scope?: "student" | "admin" }) {
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [live, setLive] = useState(false);
  const lastRefresh = useRef(0);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    let es: EventSource | null = null;
    let retry = 1000;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      es = new EventSource(`/api/realtime?scope=${scope}`);
      es.addEventListener("ready", () => {
        setLive(true);
        retry = 1000;
      });
      es.addEventListener("change", (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as { latest?: { id: string; title: string; body?: string; href?: string | null; amount?: number; courseTitle?: string | null } | null };
          const l = data.latest;
          if (l && !seen.current.has(l.id)) {
            seen.current.add(l.id);
            const t: Toast = scope === "admin"
              ? { id: l.id, title: "طلب دفع جديد", body: `${l.amount ?? ""} جنيه${l.courseTitle ? ` • ${l.courseTitle}` : ""}`, href: "/admin/payments" }
              : { id: l.id, title: l.title, body: l.body ?? "", href: l.href ?? null };
            setToasts((ts) => [t, ...ts].slice(0, 3));
            setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== t.id)), 8000);
          }
        } catch {
          /* ignore malformed */
        }
        // throttle refreshes to one per 1.5s
        const now = Date.now();
        if (now - lastRefresh.current > 1500) {
          lastRefresh.current = now;
          router.refresh();
        }
      });
      es.addEventListener("reconnect", () => {
        es?.close();
        setTimeout(connect, 300);
      });
      es.onerror = () => {
        setLive(false);
        es?.close();
        setTimeout(connect, retry);
        retry = Math.min(retry * 2, 30_000);
      };
    };
    connect();

    // Refresh when the tab becomes visible again (covers sleeping connections)
    const onVis = () => {
      if (!document.hidden) router.refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stopped = true;
      es?.close();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [router, scope]);

  return (
    <>
      <span title={live ? "متصل – التحديثات لحظية" : "جارٍ الاتصال..."} style={{ right: "max(1rem, env(safe-area-inset-right))", bottom: "max(1rem, env(safe-area-inset-bottom))" }} className="pointer-events-none fixed z-40 flex items-center gap-1.5 rounded-full border border-lav-200 bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-500 shadow backdrop-blur dark:bg-[var(--color-surface-2)]/90">
        <span className={`size-2 rounded-full ${live ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]" : "bg-amber-400"}`} />
        {live ? "مباشر" : "اتصال"}
      </span>
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-brand-200 bg-white p-4 shadow-2xl ring-1 ring-brand-100 dark:bg-[var(--color-surface-2)]" role="status">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Bell className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">{t.title}</p>
              {t.body && <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-600">{t.body}</p>}
              {t.href && <Link href={t.href} className="mt-1 inline-block text-xs font-bold text-brand-600 hover:underline">عرض</Link>}
            </div>
            <button type="button" onClick={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))} className="text-slate-400 hover:text-slate-700" aria-label="إغلاق"><X className="size-4" /></button>
          </div>
        ))}
      </div>
    </>
  );
}
