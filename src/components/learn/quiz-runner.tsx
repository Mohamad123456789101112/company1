"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, Maximize2, ShieldAlert, ShieldCheck } from "lucide-react";
import { submitQuizAction } from "@/actions/student";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { cn } from "@/lib/utils";

export type RunnerQuestion = { id: string; text: string; imageUrl: string | null; options: string[]; points: number };
type Violation = "hidden" | "leave" | "navigate" | "fullscreen_exit" | "blur" | "copy" | "paste" | "contextmenu" | "shortcut" | "printscreen" | "devtools";

const LETTERS = ["أ", "ب", "ج", "د", "هـ", "و"];

/**
 * Secure exam runner:
 * - starts only after the student accepts the rules (and enters fullscreen when required)
 * - leaving the tab / page / fullscreen cancels the attempt server-side immediately
 * - copy/paste/right-click/print-screen/devtools shortcuts are blocked and counted
 * - content is blurred whenever the window loses focus, with a personal watermark on top
 */
export function QuizRunner({
  attemptId,
  quizId,
  questions,
  deadline,
  settings,
  watermark,
}: {
  attemptId: string;
  quizId: string;
  questions: RunnerQuestion[];
  deadline: number;
  settings: { requireFullscreen: boolean; antiCheat: boolean; maxViolations: number };
  watermark: string;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [state, action] = useActionState(submitQuizAction, null);
  const [left, setLeft] = useState(() => Math.max(0, deadline - Date.now()));
  const [phase, setPhase] = useState<"rules" | "running" | "cancelled">("rules");
  const [warnings, setWarnings] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [focused, setFocused] = useState(true);
  const [cancelReason, setCancelReason] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);
  const finished = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const fsSupported = typeof document !== "undefined" && Boolean(document.documentElement.requestFullscreen);

  const report = useCallback(
    async (kind: Violation) => {
      if (finished.current || phaseRef.current !== "running" || !settings.antiCheat) return;
      try {
        const res = await fetch("/api/quiz/violation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId, kind }),
          keepalive: true,
        });
        const data = (await res.json()) as { status?: string; violations?: number; remaining?: number; reason?: string };
        if (data.status === "cancelled") {
          finished.current = true;
          setCancelReason(data.reason ?? kind);
          setPhase("cancelled");
          setTimeout(() => router.replace(`/quiz/${quizId}/result/${attemptId}`), 2500);
        } else if (data.status === "warning") {
          setWarnings(data.violations ?? 0);
          setToast(`تحذير: مخالفة مرصودة (${data.violations}/${settings.maxViolations}). ${data.remaining === 1 ? "المخالفة القادمة تلغي الامتحان!" : ""}`);
          setTimeout(() => setToast(null), 4000);
        }
      } catch {
        /* network hiccup – ignore */
      }
    },
    [attemptId, quizId, router, settings.antiCheat, settings.maxViolations],
  );

  // Timer
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      const remaining = Math.max(0, deadline - Date.now());
      setLeft(remaining);
      if (remaining === 0 && !finished.current) {
        finished.current = true;
        formRef.current?.requestSubmit();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [deadline, phase]);

  // Anti-cheat listeners
  useEffect(() => {
    if (phase !== "running" || !settings.antiCheat) return;
    const onVisibility = () => {
      if (document.hidden) {
        setFocused(false);
        void report("hidden");
      } else setFocused(true);
    };
    const onBlur = () => {
      setFocused(false);
      void report("blur");
    };
    const onFocus = () => setFocused(true);
    const onFs = () => {
      if (settings.requireFullscreen && fsSupported && !document.fullscreenElement) void report("fullscreen_exit");
    };
    const onCtx = (e: Event) => {
      e.preventDefault();
      void report("contextmenu");
    };
    const onCopy = (e: Event) => {
      e.preventDefault();
      void report("copy");
    };
    const onPaste = (e: Event) => {
      e.preventDefault();
      void report("paste");
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "printscreen") {
        e.preventDefault();
        navigator.clipboard?.writeText("").catch(() => undefined);
        void report("printscreen");
        return;
      }
      if (k === "f12" || ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(k))) {
        e.preventDefault();
        void report("devtools");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "p", "s", "u", "a"].includes(k)) {
        e.preventDefault();
        void report("shortcut");
      }
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (!finished.current) {
        e.preventDefault();
        navigator.sendBeacon?.("/api/quiz/violation", new Blob([JSON.stringify({ attemptId, kind: "leave" })], { type: "application/json" }));
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("contextmenu", onCtx);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("contextmenu", onCtx);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onUnload);
      // Navigating away inside the app (client-side) = leaving the exam
      if (!finished.current && phaseRef.current === "running") {
        navigator.sendBeacon?.("/api/quiz/violation", new Blob([JSON.stringify({ attemptId, kind: "navigate" })], { type: "application/json" }));
      }
    };
  }, [phase, settings.antiCheat, settings.requireFullscreen, fsSupported, report, attemptId]);

  const start = async () => {
    if (settings.requireFullscreen && fsSupported) {
      try {
        await document.documentElement.requestFullscreen({ navigationUI: "hide" });
      } catch {
        /* some browsers (iOS) don't allow it – continue with the other protections */
      }
    }
    setPhase("running");
  };

  const mm = String(Math.floor(left / 60000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
  const answered = Object.keys(answers).length;
  const json = useMemo(() => JSON.stringify(answers), [answers]);
  const urgent = left < 60000;

  if (phase === "cancelled") {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-rose-50 text-rose-600"><ShieldAlert className="size-8" /></span>
        <h2 className="mt-4 font-amin text-2xl font-bold text-slate-900">تم إلغاء الامتحان</h2>
        <p className="mt-2 font-taj text-sm leading-7 text-slate-600">تم رصد خروج من صفحة الامتحان أو مخالفة لقواعد النزاهة ({cancelReason}). تُحتسب هذه المحاولة بدرجة صفر. جارٍ تحويلك...</p>
      </div>
    );
  }

  if (phase === "rules") {
    return (
      <div className="card mx-auto max-w-2xl p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><ShieldCheck className="size-6" /></span>
          <div>
            <h2 className="font-amin text-xl font-bold text-slate-900">قواعد الامتحان الآمن</h2>
            <p className="text-xs text-slate-500">اقرأ القواعد جيدًا قبل البدء – المخالفة تلغي المحاولة</p>
          </div>
        </div>
        <ul className="mt-5 space-y-2.5 font-taj text-sm leading-7 text-slate-700">
          {[
            settings.requireFullscreen ? "يعمل الامتحان في وضع ملء الشاشة – الخروج منه يلغي الامتحان فورًا." : "ابقَ داخل صفحة الامتحان حتى التسليم.",
            "الانتقال لتبويب أو تطبيق آخر أو تصغير النافذة = إلغاء فوري للمحاولة واحتسابها بصفر.",
            `النسخ/اللصق/النقر بزر الفأرة الأيمن/لقطات الشاشة ممنوعة وتُسجَّل كمخالفات (الحد الأقصى ${settings.maxViolations}).`,
            "يبدأ المؤقّت فور الضغط على «ابدأ الآن» ولا يمكن إيقافه، ويتم التسليم تلقائيًا عند انتهاء الوقت.",
            "تظهر بياناتك كعلامة مائية على الأسئلة ويتم تسجيل كل الأحداث لدى الإدارة.",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2"><AlertTriangle className="mt-1.5 size-4 shrink-0 text-peach-500" /> {t}</li>
          ))}
        </ul>
        <button type="button" onClick={start} className="btn btn-primary shine mt-6 w-full py-3.5 text-base">
          <Maximize2 className="size-5" /> أوافق على القواعد – ابدأ الآن
        </button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(e) => {
        if (left > 0 && answered < questions.length && !window.confirm(`لم تُجب على ${questions.length - answered} سؤال. هل تريد التسليم؟`)) {
          e.preventDefault();
          return;
        }
        finished.current = true;
        if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
      }}
      className="no-select relative space-y-6 print:hidden"
    >
      <input type="hidden" name="attemptId" value={attemptId} />
      <input type="hidden" name="answers" value={json} />

      {/* personal watermark */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[5] overflow-hidden opacity-[0.07]">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="absolute whitespace-nowrap font-mono text-lg font-black text-slate-900 dark:text-white" style={{ top: `${(i % 6) * 18 + 4}%`, left: `${(i % 2) * 50 + 5}%`, transform: "rotate(-24deg)" }}>
            {watermark}
          </span>
        ))}
      </div>

      <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-lav-200 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur-xl sm:px-4 sm:py-3 dark:bg-[var(--color-surface-2)]/95">
        <span className="text-sm font-bold text-slate-600">أجبت {answered} / {questions.length}</span>
        <div className="flex items-center gap-2">
          {settings.antiCheat && (
            <span className={cn("hidden items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold sm:flex", warnings > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>
              <ShieldCheck className="size-3.5" /> مخالفات {warnings}/{settings.maxViolations}
            </span>
          )}
          <span className={cn("flex items-center gap-2 rounded-xl px-3 py-1.5 font-mono text-lg font-black", urgent ? "animate-pulse bg-rose-50 text-rose-600" : "bg-brand-50 text-brand-700")} dir="ltr">
            <Clock className="size-4" /> {mm}:{ss}
          </span>
        </div>
      </div>

      {toast && <div className="sticky top-20 z-20 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 shadow">{toast}</div>}
      <FormMessage state={state} />

      <div className={cn("space-y-6 transition", !focused && "blur-xl")}>
        {questions.map((q, qi) => (
          <div key={q.id} className="card p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-sm font-black text-brand-700">{qi + 1}</span>
              <div className="flex-1">
                <p className="text-base font-bold leading-8 text-slate-900">{q.text}</p>
                {q.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={q.imageUrl} alt="" className="pointer-events-none mt-3 max-h-80 rounded-xl border border-lav-200" draggable={false} />
                )}
              </div>
              <span className="text-[11px] text-slate-500">{q.points} درجة</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {q.options.map((opt, oi) => {
                const selected = answers[q.id] === oi;
                return (
                  <button
                    type="button"
                    key={oi}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-4 py-3 text-start text-sm transition",
                      selected ? "border-brand-500 bg-brand-50 text-slate-900 ring-1 ring-brand-300" : "border-lav-200 bg-white text-slate-700 hover:border-brand-300",
                    )}
                  >
                    <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border text-xs font-black", selected ? "border-brand-500 bg-brand-500 text-white" : "border-lav-300")}>{LETTERS[oi]}</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="flex items-center gap-2 text-xs text-slate-500"><AlertTriangle className="size-4 text-peach-500" /> بعد التسليم لا يمكن تعديل الإجابات.</p>
        <SubmitButton className="btn btn-accent px-8 py-3" pendingText="جارٍ التصحيح...">تسليم الامتحان</SubmitButton>
      </div>
    </form>
  );
}
