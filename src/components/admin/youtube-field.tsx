"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardPaste, ExternalLink, Eye, EyeOff, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { YoutubeIcon } from "@/components/icons";
import { Field, Input } from "@/components/ui";
import { fetchYouTubeMetaAction, type YouTubeMeta } from "@/actions/youtube";
import { extractYouTubeId } from "@/lib/utils";

/**
 * "رابط الفيديو من يوتيوب" field with **YouTube Auto-Fetch**:
 * the moment a link is pasted, the platform fills in the lesson title,
 * the duration (minutes) and the thumbnail automatically — the teacher
 * can still edit everything. The stored value is just the URL.
 *
 * `sync` (optional) lets the lesson form keep its title/duration inputs
 * in sync with what was fetched.
 */
export function YouTubeField({ defaultValue, showPreview }: { defaultValue?: string | null; showPreview?: boolean }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [preview, setPreview] = useState(false);
  const [meta, setMeta] = useState<YouTubeMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const lastFetched = useRef<string>("");
  const id = useMemo(() => (value.trim() ? extractYouTubeId(value.trim()) : null), [value]);
  const invalid = value.trim().length > 0 && !id;

  const fetchMeta = useCallback(async (videoId: string) => {
    if (lastFetched.current === videoId) return;
    lastFetched.current = videoId;
    setLoading(true);
    try {
      const res = await fetchYouTubeMetaAction(`https://youtu.be/${videoId}`);
      setMeta(res);
      if (res.ok) setApplied(true);
    } catch {
      setMeta({ ok: false, error: "تعذر الاتصال بيوتيوب – اكتب البيانات يدويًا" });
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch right after the link becomes valid (async → no sync setState)
  useEffect(() => {
    if (!id) return;
    // Fetching is async: the state updates arrive after the network round-trip.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMeta(id);
  }, [id, fetchMeta]);

  // Fill the form fields (title / duration) once, without overwriting user typing
  useEffect(() => {
    if (!applied || !meta?.ok) return;
    const titleEl = document.getElementById("l_title") as HTMLInputElement | null;
    const durEl = document.getElementById("l_duration") as HTMLInputElement | null;
    if (titleEl && !titleEl.value.trim() && meta.title) titleEl.value = meta.title;
    if (durEl && (!durEl.value || durEl.value === "0") && meta.durationMinutes) durEl.value = String(meta.durationMinutes);
  }, [applied, meta]);

  return (
    <div className="space-y-3">
      <Field
        label="رابط الفيديو من يوتيوب"
        name="l_video"
        error={invalid ? "الرابط غير صالح – انسخه من زر «مشاركة» في يوتيوب" : undefined}
        hint="ارفع الشرح «غير مدرج (Unlisted)» ثم الصق الرابط – المنصة تجلب العنوان والمدة والصورة تلقائيًا وتخزّن الرابط فقط"
      >
        <div className="relative">
          <YoutubeIcon className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-rose-500" />
          <Input
            id="l_video"
            name="videoUrl"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text");
              if (pasted && extractYouTubeId(pasted.trim())) {
                e.preventDefault();
                setValue(pasted.trim());
              }
            }}
            dir="ltr"
            placeholder="https://youtu.be/XXXXXXXXXXX"
            className="pr-10 pl-10"
            autoComplete="off"
          />
          {loading ? (
            <Loader2 className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 animate-spin text-brand-500" />
          ) : (
            id && <CheckCircle2 className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-emerald-500" />
          )}
        </div>
      </Field>

      {/* Auto-fetch result */}
      {id && (
        <div className="overflow-hidden rounded-2xl border border-lav-200 bg-white dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-lav-200 bg-lav-50 px-3 py-2 text-[11px] dark:border-white/10 dark:bg-white/5">
            <span className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
              {loading ? <><Loader2 className="size-3.5 animate-spin" /> جارٍ جلب بيانات الفيديو…</> : <><Sparkles className="size-3.5" /> تم جلب بيانات الفيديو تلقائيًا</>}
            </span>
            <span className="flex items-center gap-3">
              {!loading && (
                <button type="button" onClick={() => { lastFetched.current = ""; void fetchMeta(id); }} className="flex items-center gap-1 font-bold text-brand-600 hover:underline dark:text-brand-300">
                  <RefreshCw className="size-3.5" /> تحديث
                </button>
              )}
              {showPreview !== false && (
                <button type="button" onClick={() => setPreview((p) => !p)} className="flex items-center gap-1 font-bold text-brand-600 hover:underline dark:text-brand-300">
                  {preview ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />} {preview ? "إخفاء المعاينة" : "معاينة"}
                </button>
              )}
              <a href={`https://youtu.be/${id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:text-slate-300">
                <ExternalLink className="size-3.5" /> فتح
              </a>
            </span>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-[160px_1fr] sm:items-center">
            {preview ? (
              <div className="aspect-video w-full overflow-hidden rounded-xl bg-black sm:col-span-2">
                <iframe src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`} className="size-full" title="معاينة" allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={meta?.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" className="aspect-video w-full rounded-xl object-cover" loading="lazy" />
            )}
            {!preview && (
              <div className="min-w-0 space-y-1.5 text-xs">
                <p className="flex items-start gap-1.5 font-black leading-5 text-slate-900 dark:text-slate-100">
                  <ClipboardPaste className="mt-0.5 size-3.5 shrink-0 text-brand-500" />
                  <span className="line-clamp-2">{meta?.title ?? (loading ? "…" : "لم يتم جلب العنوان")}</span>
                </p>
                {meta?.author && <p className="text-slate-500 dark:text-slate-300">القناة: {meta.author}</p>}
                <p className="text-slate-500 dark:text-slate-300">
                  المدة: <b className="text-slate-900 dark:text-slate-100">{meta?.durationMinutes ? `${meta.durationMinutes} دقيقة` : "غير متاحة – أدخلها يدويًا"}</b>
                  <span className="mx-2 text-slate-300">•</span>
                  المعرّف: <span className="font-mono" dir="ltr">{id}</span>
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">تم ملء العنوان والمدة في النموذج تلقائيًا — عدّلهما إن أردت.</p>
                {meta && !meta.ok && <p className="flex items-start gap-1 text-[11px] text-amber-700 dark:text-amber-300"><AlertTriangle className="mt-0.5 size-3 shrink-0" /> {meta.error}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      <details className="rounded-2xl border border-amber-200 bg-amber-50/70 text-xs leading-6 text-amber-900 dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-amber-200">
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
