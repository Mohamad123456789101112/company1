"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";

type Props = {
  /** opaque signed token – the real URL is resolved server-side */
  mediaToken: string;
  /** identity lines rendered as a dynamic watermark */
  watermark: { name: string; phone: string; id: string };
  title: string;
};

/**
 * Secure player:
 * - resolves the embed URL from /api/media/<token> at play time (never present in HTML)
 * - dynamic watermark: the student's name + phone + id drift across the frame, plus a
 *   faint tiled layer – both survive screen recording and identify the source of leaks
 * - pauses/blurs when the tab is hidden or focus is lost, blocks context menu & drag
 */
export function VideoPlayer({ mediaToken, watermark, title }: Props) {
  const [embed, setEmbed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState({ top: 12, left: 10 });
  const [hidden, setHidden] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const load = useCallback(async () => {
    setError(null);
    setEmbed(null);
    try {
      const res = await fetch(`/api/media/${mediaToken}`, { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) {
        setError(res.status === 403 ? "انتهت صلاحية الجلسة أو ليس لديك صلاحية لهذا الدرس." : "تعذر تحميل الفيديو.");
        return;
      }
      const data = (await res.json()) as { embed: string };
      setEmbed(data.embed);
    } catch {
      setError("تعذر الاتصال بالخادم.");
    }
  }, [mediaToken]);

  useEffect(() => {
    void load();
  }, [load]);

  // Drifting watermark
  useEffect(() => {
    const id = setInterval(() => setPos({ top: 6 + Math.random() * 80, left: 6 + Math.random() * 72 }), 5000);
    return () => clearInterval(id);
  }, []);

  // Hide the stream when the tab is not visible / window not focused (defeats many recorders)
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    const onBlur = () => setHidden(true);
    const onFocus = () => setHidden(false);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const label = `${watermark.name} • ${watermark.phone}`;
  const tiles = Array.from({ length: 9 });

  return (
    <div
      className="no-select relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-2xl"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {embed && !error ? (
        <iframe
          ref={frameRef}
          src={embed}
          title={title}
          className={`absolute inset-0 size-full transition ${hidden ? "opacity-0" : "opacity-100"}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-white/80">
          {error ? (
            <div className="text-center">
              <ShieldAlert className="mx-auto size-8 text-rose-400" />
              <p className="mt-2 text-sm font-bold">{error}</p>
              <button type="button" onClick={load} className="mt-3 inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20"><RefreshCw className="size-3.5" /> إعادة المحاولة</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm"><Loader2 className="size-5 animate-spin" /> جارٍ تأمين الفيديو...</div>
          )}
        </div>
      )}

      {hidden && embed && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/90 text-center text-white">
          <div>
            <ShieldAlert className="mx-auto size-8 text-peach-300" />
            <p className="mt-2 text-sm font-bold">تم إيقاف العرض مؤقتًا</p>
            <p className="text-xs text-white/70">ارجع لنافذة الدرس لمتابعة المشاهدة</p>
          </div>
        </div>
      )}

      {/* Shields: block the clickable YouTube title (top) and logo (bottom-right) so the lesson cannot be opened on youtube.com from the player */}
      {embed && !error && (
        <>
          <div aria-hidden="true" className="absolute inset-x-0 top-0 z-[9] h-[14%]" />
          <div aria-hidden="true" className="absolute bottom-0 right-0 z-[9] h-[12%] w-[18%]" />
        </>
      )}
      {/* faint tiled identity layer */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 grid grid-cols-3 grid-rows-3 opacity-[0.12]">
        {tiles.map((_, i) => (
          <span key={i} className="flex items-center justify-center whitespace-nowrap font-mono text-[11px] font-black text-white" style={{ transform: "rotate(-18deg)" }} dir="ltr">
            {watermark.phone} • {watermark.id}
          </span>
        ))}
      </div>
      {/* drifting badge */}
      <div className="pointer-events-none absolute z-10 rounded-md bg-black/35 px-2 py-0.5 text-[11px] font-bold text-white/80 backdrop-blur-[1px] transition-all duration-1000" style={{ top: `${pos.top}%`, left: `${pos.left}%` }} dir="ltr">
        {label}
      </div>
    </div>
  );
}
