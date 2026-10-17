"use client";

import { useEffect, useState } from "react";
import { ExternalLink, ShieldCheck } from "lucide-react";

/**
 * Protected PDF viewer: the document is streamed through the signed media
 * gateway (no direct file URL), rendered inside a sandboxed frame with the
 * toolbar hidden, and covered by a dynamic identity watermark grid.
 * Context menu, drag and keyboard save/print shortcuts are blocked.
 */
export function PdfViewer({ mediaToken, watermark, external }: { mediaToken: string; watermark: { name: string; phone: string; id: string; ip?: string | null }; external?: boolean }) {
  const [hidden, setHidden] = useState(false);
  const src = `/api/media/${mediaToken}${external ? "" : "#toolbar=0&navpanes=0&scrollbar=1&view=FitH"}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["s", "p", "u"].includes(e.key.toLowerCase())) e.preventDefault();
    };
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div className="no-select relative overflow-hidden rounded-xl border border-lav-200 bg-white" onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()}>
      <div className="flex items-center justify-between border-b border-lav-200 bg-lav-50 px-3 py-2 text-[11px] text-slate-600">
        <span className="flex items-center gap-1.5 font-bold text-emerald-700"><ShieldCheck className="size-3.5" /> ملف محمي – مخصص لك فقط</span>
        {external && <a href={src} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-bold text-brand-600 hover:underline"><ExternalLink className="size-3.5" /> فتح</a>}
      </div>
      <div className="relative aspect-[3/4] w-full sm:aspect-[4/3]">
        <iframe src={src} className={`absolute inset-0 size-full ${hidden ? "opacity-0" : ""}`} title="مذكرة الدرس" sandbox="allow-scripts allow-same-origin" referrerPolicy="same-origin" />
        {/* identity watermark grid */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-4 opacity-[0.14] sm:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="flex items-center justify-center whitespace-nowrap font-mono text-xs font-black text-brand-900" style={{ transform: "rotate(-22deg)" }} dir="ltr">
              {watermark.name} • {watermark.phone}
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-slate-900/70 px-2 py-0.5 font-mono text-[10px] text-white" dir="ltr">{watermark.phone} • {watermark.id}{watermark.ip ? ` • ${watermark.ip}` : ""}</div>
      </div>
    </div>
  );
}
