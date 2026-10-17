"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clapperboard, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "idle" | "creating" | "uploading" | "processing" | "ready" | "error";

/**
 * Direct-to-Bunny video uploader (resumable TUS). The browser talks to Bunny
 * directly with short-lived presigned credentials; our server only creates the
 * video object. On success it fills the hidden provider/url fields of the lesson form.
 */
export function VideoUploader({ enabled, defaultUrl, titleHint }: { enabled: boolean; defaultUrl?: string | null; titleHint?: string }) {
  const [phase, setPhase] = useState<Phase>(defaultUrl?.includes("mediadelivery.net") ? "ready" : "idle");
  const [progress, setProgress] = useState(0);
  const [embedUrl, setEmbedUrl] = useState<string>(defaultUrl?.includes("mediadelivery.net") ? defaultUrl : "");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<{ abort: (shouldTerminate?: boolean) => Promise<void> } | null>(null);
  const videoIdRef = useRef<string>("");

  // poll encoding status
  useEffect(() => {
    if (phase !== "processing" || !videoIdRef.current) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/admin/bunny/status?id=${videoIdRef.current}`, { cache: "no-store" });
        const d = (await r.json()) as { label?: string; ready?: boolean; progress?: number; status?: number };
        if (stop) return;
        setStatus(`${d.label ?? ""}${d.progress ? ` ${d.progress}%` : ""}`);
        if (d.ready) {
          setPhase("ready");
          return;
        }
        if (d.status === 5) {
          setError("فشل الترميز في Bunny – جرّب ملفًا آخر");
          setPhase("error");
          return;
        }
      } catch {
        /* keep polling */
      }
      if (!stop) setTimeout(tick, 4000);
    };
    void tick();
    return () => {
      stop = true;
    };
  }, [phase]);

  const start = async (file: File) => {
    setError("");
    if (!file.type.startsWith("video/")) {
      setError("اختر ملف فيديو (MP4 / MOV / MKV ...)");
      setPhase("error");
      return;
    }
    if (file.size > 8 * 1024 * 1024 * 1024) {
      setError("الحد الأقصى 8 جيجابايت");
      setPhase("error");
      return;
    }
    setFileName(file.name);
    setPhase("creating");
    try {
      const res = await fetch("/api/admin/bunny/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: titleHint || file.name }) });
      const cred = (await res.json()) as { error?: string; videoId: string; libraryId: string; signature: string; expires: number; endpoint: string; embedUrl: string };
      if (!res.ok || cred.error) throw new Error(cred.error ?? "تعذر إنشاء الفيديو");
      videoIdRef.current = cred.videoId;
      const { Upload } = await import("tus-js-client");
      setPhase("uploading");
      const up = new Upload(file, {
        endpoint: cred.endpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
        chunkSize: 50 * 1024 * 1024,
        headers: { AuthorizationSignature: cred.signature, AuthorizationExpire: String(cred.expires), VideoId: cred.videoId, LibraryId: cred.libraryId },
        metadata: { filetype: file.type, title: titleHint || file.name },
        onError: (err) => {
          setError(`فشل الرفع: ${err.message}`);
          setPhase("error");
        },
        onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
        onSuccess: () => {
          setEmbedUrl(cred.embedUrl);
          setPhase("processing");
          setStatus("تم الرفع – جارٍ المعالجة في Bunny");
        },
      });
      uploadRef.current = up;
      up.start();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل الرفع");
      setPhase("error");
    }
  };

  const cancel = async () => {
    try {
      await uploadRef.current?.abort(true);
    } catch {
      /* ignore */
    }
    setPhase("idle");
    setProgress(0);
    setEmbedUrl("");
    if (inputRef.current) inputRef.current.value = "";
  };

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-dashed border-lav-300 bg-lav-50 p-4 text-xs leading-6 text-slate-500">
        لرفع الفيديوهات من جهازك مباشرة فعّل <b>Bunny Stream</b> من <a href="/admin/media" className="font-bold text-brand-600 hover:underline">إعدادات الفيديو</a> (استضافة فيديو آمنة بروابط موقّعة). حاليًا يمكنك إدخال رابط YouTube/Vimeo/Drive في الحقل أعلاه.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-lav-200 bg-white p-4">
      {/* these feed the lesson form */}
      {embedUrl && (
        <>
          <input type="hidden" name="videoProvider" value="bunny" />
          <input type="hidden" name="videoUrl" value={embedUrl} />
        </>
      )}
      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && start(e.target.files[0])} />

      {phase === "idle" || phase === "error" ? (
        <button type="button" onClick={() => inputRef.current?.click()} className={cn("flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition hover:border-brand-400 hover:bg-brand-50/40", phase === "error" ? "border-rose-300 bg-rose-50/40" : "border-lav-300 bg-lav-50")}>
          <Clapperboard className="size-8 text-brand-500" />
          <span className="text-sm font-bold text-slate-800">ارفع الفيديو من جهازك</span>
          <span className="text-xs text-slate-500">يُرفع مباشرة إلى Bunny Stream (قابل للاستئناف) حتى 8 جيجابايت – ويُحمى بروابط موقّعة وعلامة مائية</span>
          {error && <span className="mt-1 text-xs font-bold text-rose-600">{error}</span>}
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <span className={cn("grid size-12 shrink-0 place-items-center rounded-xl", phase === "ready" ? "bg-emerald-50 text-emerald-600" : "bg-brand-50 text-brand-600")}>
            {phase === "ready" ? <CheckCircle2 className="size-6" /> : phase === "uploading" ? <Upload className="size-6 animate-pulse" /> : <Loader2 className="size-6 animate-spin" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-800">{fileName || "فيديو Bunny"}</p>
            {phase === "creating" && <p className="text-xs text-slate-500">جارٍ تجهيز الرفع...</p>}
            {phase === "uploading" && (
              <div className="mt-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-lav-200"><div className="h-full rounded-full bg-gradient-to-l from-brand-500 to-peach-400 transition-all" style={{ width: `${progress}%` }} /></div>
                <p className="mt-1 text-[11px] text-slate-500">جارٍ الرفع {progress}% – لا تغلق الصفحة</p>
              </div>
            )}
            {phase === "processing" && <p className="text-xs text-amber-600">{status || "جارٍ المعالجة..."} (يمكنك حفظ الدرس الآن وسيعمل الفيديو فور انتهاء المعالجة)</p>}
            {phase === "ready" && <p className="text-xs font-bold text-emerald-600">الفيديو جاهز للعرض ✓</p>}
          </div>
          {phase !== "creating" && (
            <button type="button" onClick={cancel} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="إلغاء"><X className="size-4" /></button>
          )}
        </div>
      )}
    </div>
  );
}
