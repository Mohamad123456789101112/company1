"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileText, ImagePlus, Loader2, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "receipt" | "pdf" | "image";

/**
 * Uploads a file to /api/upload (with progress) and exposes the resulting
 * file id through a hidden input so the surrounding server-action form can use it.
 */
export function Uploader({ name, kind, label, hint, defaultUrl, className }: { name: string; kind: Kind; label: string; hint?: string; defaultUrl?: string | null; className?: string }) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(defaultUrl ? "done" : "idle");
  const [progress, setProgress] = useState(0);
  const [fileId, setFileId] = useState<string>("");
  const [preview, setPreview] = useState<string | null>(defaultUrl ?? null);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const accept = kind === "pdf" ? "application/pdf" : "image/jpeg,image/png,image/webp";

  const upload = (file: File) => {
    setError("");
    if (file.size > 4 * 1024 * 1024) {
      setError("حجم الملف أكبر من 4 ميجابايت");
      setStatus("error");
      return;
    }
    setStatus("uploading");
    setProgress(0);
    setFileName(file.name);
    if (kind !== "pdf") setPreview(URL.createObjectURL(file));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/upload?kind=${kind}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText) as { id?: string; url?: string; error?: string };
        if (xhr.status >= 200 && xhr.status < 300 && res.id) {
          setFileId(res.id);
          setStatus("done");
          if (kind !== "pdf" && res.url) setPreview(res.url);
        } else {
          setError(res.error ?? "فشل رفع الملف");
          setStatus("error");
        }
      } catch {
        setError("فشل رفع الملف");
        setStatus("error");
      }
    };
    xhr.onerror = () => {
      setError("تعذر الاتصال بالخادم");
      setStatus("error");
    };
    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  };

  const reset = () => {
    setFileId("");
    setPreview(null);
    setFileName("");
    setStatus("idle");
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={className}>
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={fileId} />
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />

      {status === "idle" || status === "error" ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) upload(f);
          }}
          className={cn("flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition hover:border-brand-400 hover:bg-brand-50/50", status === "error" ? "border-rose-300 bg-rose-50/40" : "border-lav-300 bg-lav-50")}
        >
          {kind === "pdf" ? <FileText className="size-8 text-brand-500" /> : <ImagePlus className="size-8 text-brand-500" />}
          <span className="text-sm font-bold text-slate-700">{kind === "pdf" ? "اضغط لاختيار ملف PDF أو اسحبه هنا" : "اضغط لاختيار صورة أو اسحبها هنا"}</span>
          <span className="text-xs text-slate-500">{hint ?? (kind === "pdf" ? "PDF حتى 4 ميجابايت" : "JPG / PNG / WEBP حتى 4 ميجابايت")}</span>
          {error && <span className="mt-1 text-xs font-bold text-rose-600">{error}</span>}
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-lav-200 bg-white p-3">
          {preview && kind !== "pdf" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-16 rounded-xl object-cover" />
          ) : (
            <span className="grid size-16 place-items-center rounded-xl bg-brand-50 text-brand-600"><FileText className="size-7" /></span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-800">{fileName || (kind === "pdf" ? "ملف PDF مرفوع" : "صورة مرفوعة")}</p>
            {status === "uploading" ? (
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-lav-200"><div className="h-full rounded-full bg-gradient-to-l from-brand-500 to-peach-400 transition-all" style={{ width: `${progress}%` }} /></div>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><Loader2 className="size-3 animate-spin" /> جارٍ الرفع {progress}%</p>
              </div>
            ) : (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-600"><CheckCircle2 className="size-3.5" /> تم الرفع بنجاح</p>
            )}
          </div>
          {status !== "uploading" && (
            <button type="button" onClick={reset} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="إزالة"><X className="size-4" /></button>
          )}
          {status === "uploading" && <UploadCloud className="size-5 animate-pulse text-brand-500" />}
        </div>
      )}
    </div>
  );
}
