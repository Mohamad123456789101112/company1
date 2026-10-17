"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, Eye, EyeOff, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { YoutubeIcon } from "@/components/icons";
import { Field, Input } from "@/components/ui";
import { extractYouTubeId } from "@/lib/utils";

type Meta = { title: string | null; durationSeconds: number | null; thumbnail: string | null };

/**
 * "رابط الفيديو من يوتيوب" field:
 *  • validates the link instantly + shows the thumbnail / private preview.
 *  • AUTO-FETCH: the moment a valid link is pasted it pulls the video's
 *    title, duration and thumbnail and fills the lesson fields automatically.
 *  • Reminds the teacher to upload as UNLISTED. Only the URL is stored in DB.
 */
export function YouTubeField({ defaultValue }: { defaultValue?: string | null }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [preview, setPreview] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const ownedTitle = useRef(false);
  const ownedDuration = useRef(false);

  const id = useMemo(() => (value.trim() ? extractYouTubeId(value.trim()) : null), [value]);
  const invalid = value.trim().length > 0 && !id;

  // Auto-fetch title / duration / thumbnail whenever the video id changes.
  useEffect(() => {
    if (!id) {
      setMeta(null);
      return;
    }
    let alive = true;
    const t = setTimeout(async () => {
      if (alive) setLoading(true);
      try {
        const res = await fetch(`/api/admin/youtube?url=${encodeURIComponent(id)}`);
        const data = (await res.json()) as Meta & { ok: boolean };
        if (!alive) return;
        setMeta({ title: data.title ?? null, durationSeconds: data.durationSeconds ?? null, thumbnail: data.thumbnail ?? null });
        const form = rootRef.current?.closest("form");
        if (form) {
          const titleInput = form.querySelector<HTMLInputElement>('input[name="title"]');
          const durationInput = form.querySelector<HTMLInputElement>('input[name="durationMinutes"]');
          if (titleInput && (titleInput.value.trim() === "" || ownedTitle.current) && data.title) {
            titleInput.value = data.title;
            titleInput.dispatchEvent(new Event("input", { bubbles: true }));
            ownedTitle.current = true;
          }
          if (durationInput && data.durationSeconds && data.durationSeconds > 0) {
            const minutes = Math.max(1, Math.round(data.durationSeconds / 60));
            if (durationInput.value === "" || durationInput.value === "0" || ownedDuration.current) {
              durationInput.value = String(minutes);
              durationInput.dispatchEvent(new Event("input", { bubbles: true }));
              ownedDuration.current = true;
            }
          }
        }
      } catch {
        /* network blocked – thumbnail fallback still works */
      } finally {
        if (alive) setLoading(false);
      }
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [id]);

  return (
    <div ref={rootRef} className="space-y-3">
      <Field label="رابط الفيديو من يوتيوب" name="l_video" error={invalid ? "الرابط غير صالح – انسخه من زر «مشاركة» في يوتيوب" : undefined} hint="الصق الرابط وسيتم جلب اسم الدرس والمدة والصورة تلقائيًا – ارفع الشرح على قناتك بحالة «غير مدرج (Unlisted)»">
        <div className="relative">
          <YoutubeIcon className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-rose-500" />
          <Input id="l_video" name="videoUrl" value={value} onChange={(e) => setValue(e.target.value)} dir="ltr" placeholder="https://youtu.be/XXXXXXXXXXX" className="pr-10" autoComplete="off" />
          {id && <CheckCircle2 className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-emerald-500" />}
        </div>
      </Field>

      {id && (
        <div className="overflow-hidden rounded-2xl border border-lav-200 bg-white">
          <div className="flex items-center justify-between gap-2 border-b border-lav-200 bg-lav-50 px-3 py-2 text-[11px]">
            <span className="flex items-center gap-1.5 font-bold text-emerald-700">
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              {loading ? "جارٍ جلب بيانات الفيديو تلقائيًا…" : "تم التعرف على الفيديو"}
              <span className="font-mono text-slate-500" dir="ltr">({id})</span>
            </span>
            <span className="flex items-center gap-2">
              <button type="button" onClick={() => setPreview((p) => !p)} className="flex items-center gap-1 font-bold text-brand-600 hover:underline">{preview ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />} {preview ? "إخفاء المعاينة" : "معاينة"}</button>
              <a href={`https://youtu.be/${id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-slate-500 hover:text-slate-800"><ExternalLink className="size-3.5" /> فتح</a>
            </span>
          </div>

          {meta && !loading && (meta.title || meta.durationSeconds) && (
            <div className="flex flex-wrap items-center gap-2 border-b border-lav-200 bg-emerald-50/60 px-3 py-2 text-[11px] text-emerald-800">
              <Sparkles className="size-3.5" />
              <span className="font-bold">تم الجلب تلقائيًا:</span>
              {meta.title && <span className="max-w-[22rem] truncate font-bold">{meta.title}</span>}
              {meta.durationSeconds != null && <span className="rounded-full bg-emerald-200/60 px-2 py-0.5 font-bold">{Math.round(meta.durationSeconds / 60)} دقيقة</span>}
              <span className="text-emerald-700/80">تم ملء عنوان الدرس والمدة</span>
            </div>
          )}

          {preview ? (
            <div className="aspect-video w-full bg-black">
              <iframe src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`} className="size-full" title="معاينة" allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={meta?.thumbnail ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" className="aspect-video w-full object-cover" loading="lazy" />
          )}
        </div>
      )}

      <details className="rounded-2xl border border-amber-200 bg-amber-50/70 text-xs leading-6 text-amber-900">
        <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 font-bold"><AlertTriangle className="size-4" /> كيف أرفع الفيديو «غير مدرج» على يوتيوب؟ (مهم جدًا)</summary>
        <ol className="list-inside list-decimal space-y-1 px-4 pb-3">
          <li>افتح <span dir="ltr">studio.youtube.com</span> → «إنشاء» → «تحميل فيديوهات» واختر ملف الشرح.</li>
          <li>في خطوة «مستوى الظهور» اختر <b>غير مدرج (Unlisted)</b> – وليس «عام» ولا «خاص».</li>
          <li>بعد انتهاء المعالجة اضغط «مشاركة» وانسخ الرابط والصقه في الخانة أعلاه.</li>
          <li>مهم: اترك خيار «السماح بالتضمين» <b>مفعّلًا</b> (وإلا لن يعمل داخل المنصة)، ويمكنك تعطيل «التعليقات» وإلغاء إضافة الفيديو لأي قائمة تشغيل عامة.</li>
        </ol>
      </details>
    </div>
  );
}
