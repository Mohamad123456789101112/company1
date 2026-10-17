import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft, ArrowRight, CalendarClock, CheckCircle2, ClipboardCheck, FileText, Home, Lock, PlayCircle } from "lucide-react";
import { db } from "@/db";
import { lessons, quizzes } from "@/db/schema";
import { isStaff, requireUser } from "@/lib/auth";
import { canOpenLesson, getAccessState, getGatedLessonIds } from "@/lib/access";
import { getCompletedLessonIds, getCourseBySlug, getCourseExams, getCurriculum, getLessonExams } from "@/lib/data";
import { markLessonCompleteAction } from "@/actions/student";
import { VideoPlayer } from "@/components/learn/video-player";
import { PdfViewer } from "@/components/learn/pdf-viewer";
import { signMedia } from "@/lib/media-token";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge, ProgressBar } from "@/components/ui";
import { cn, formatDate, maskPhone } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "مشاهدة الدرس" };

const typeIcon = { video: PlayCircle, pdf: FileText, quiz: ClipboardCheck } as const;

export default async function LessonPage({ params, searchParams }: { params: Promise<{ slug: string; lessonId: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug, lessonId } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/learn/${slug}/${lessonId}`);
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const [lesson] = await db.select().from(lessons).where(and(eq(lessons.id, lessonId), eq(lessons.courseId, course.id))).limit(1);
  if (!lesson || (!lesson.isPublished && !isStaff(user))) notFound();

  const state = await getAccessState(user, course.id);
  if (!canOpenLesson(state, lesson)) redirect(`/courses/${slug}?locked=1`);

  const [units, done, exams, lessonExams, gated] = await Promise.all([
    getCurriculum(course.id, isStaff(user)),
    getCompletedLessonIds(user.id, course.id),
    getCourseExams(course.id),
    getLessonExams(lesson.id),
    user.role === "student" ? getGatedLessonIds(user.id, course.id) : Promise.resolve(new Set<string>()),
  ]);
  if (gated.has(lesson.id)) redirect(`/learn/${slug}?gated=${lesson.id}`);
  const all = units.flatMap((u) => u.lessons);
  const openable = all.filter((l) => canOpenLesson(state, l) && !gated.has(l.id));
  const idx = openable.findIndex((l) => l.id === lesson.id);
  const prev = idx > 0 ? openable[idx - 1] : null;
  const next = idx >= 0 && idx < openable.length - 1 ? openable[idx + 1] : null;
  const progress = openable.length ? Math.round((openable.filter((l) => done.has(l.id)).length / openable.length) * 100) : 0;

  const quiz = lesson.type === "quiz" ? (await db.select().from(quizzes).where(eq(quizzes.lessonId, lesson.id)).limit(1))[0] : null;
  // Signed, short-lived tokens – the real provider URL / file path never reaches the browser.
  const videoToken = lesson.type === "video" && lesson.videoUrl ? signMedia({ l: lesson.id, u: user.id, k: "video" }) : null;
  const pdfToken = lesson.pdfUrl ? signMedia({ l: lesson.id, u: user.id, k: "pdf" }) : null;
  const pdfExternal = Boolean(lesson.pdfUrl && !lesson.pdfUrl.startsWith("/api/files/"));
  const identity = { name: user.name.split(" ").slice(0, 2).join(" "), phone: user.phone ?? maskPhone(user.email), id: user.id.slice(0, 8).toUpperCase() };

  return (
    <div className="min-h-screen bg-lav-50 dark:bg-[var(--color-surface-0)]">
      <header className="sticky top-0 z-30 border-b border-lav-200 bg-white/90 backdrop-blur-xl dark:bg-[var(--color-surface)]/90">
        <div className="container-x flex h-14 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard" className="btn btn-ghost btn-sm"><Home className="size-4" /></Link>
            <Link href={`/courses/${course.slug}`} className="truncate text-sm font-black text-slate-900 hover:text-brand-600">{course.title}</Link>
            {!state.full && user.role === "student" && <Badge tone="accent">وصول سنتر</Badge>}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 sm:inline">تقدمك {progress}%</span>
            <ProgressBar value={progress} className="hidden w-40 sm:block" />
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      <div className="container-x grid gap-6 py-6 lg:grid-cols-[1fr_340px]">
        <main className="min-w-0">
          {sp.activated && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-800">🎉 تم تفعيل الكورس بنجاح – ذاكرة سعيدة!</div>}

          {lesson.type === "video" && (
            videoToken ? <VideoPlayer mediaToken={videoToken} watermark={identity} title={lesson.title} /> : <div className="card grid aspect-video place-items-center text-sm text-slate-500">لم يتم إضافة فيديو لهذا الدرس بعد.</div>
          )}

          {lesson.type === "pdf" && (
            <div className="card p-4 sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600"><FileText className="size-6" /></span>
                <div>
                  <p className="text-sm font-black text-slate-900">مذكرة الدرس (PDF محمي)</p>
                  <p className="text-xs text-slate-500">العرض داخل المنصة فقط – مطبوع عليها بياناتك لحمايتها من التسريب</p>
                </div>
              </div>
              {pdfToken ? <PdfViewer mediaToken={pdfToken} watermark={identity} external={pdfExternal} /> : <p className="text-sm text-slate-500">لم يتم رفع الملف بعد.</p>}
            </div>
          )}

          {lesson.type === "quiz" && (
            <div className="card relative overflow-hidden p-8 text-center">
              <div className="grid-bg absolute inset-0" />
              <div className="relative">
                <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-violet-50 text-violet-600"><ClipboardCheck className="size-8" /></span>
                <h2 className="mt-4 font-amin text-xl font-bold text-slate-900">{quiz?.title ?? lesson.title}</h2>
                {quiz ? (
                  <>
                    <p className="mt-2 text-sm text-slate-500">المدة {quiz.durationMinutes} دقيقة • درجة النجاح {quiz.passPercent}% • المحاولات {quiz.maxAttempts}</p>
                    {quiz.availableFrom && <p className="mt-1 text-xs text-peach-600">يفتح {formatDate(quiz.availableFrom, true)}</p>}
                    <Link href={`/quiz/${quiz.id}`} className="btn btn-primary mt-6 px-8 py-3">الدخول إلى الامتحان</Link>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">لم يتم إعداد الامتحان بعد.</p>
                )}
              </div>
            </div>
          )}

          {lesson.type !== "quiz" && lessonExams.length > 0 && (
            <div className="card mt-5 p-5">
              <p className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900"><ClipboardCheck className="size-4 text-brand-500" /> امتحانات هذا الدرس</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {lessonExams.map((q) => (
                  <li key={q.id}>
                    <Link href={`/quiz/${q.id}`} className="flex items-center justify-between rounded-xl border border-lav-200 px-3 py-2.5 text-sm hover:border-brand-300 hover:bg-lav-50">
                      <span className="font-bold text-slate-800">{q.title}</span>
                      <span className="text-[11px] text-slate-500">{q.durationMinutes} د{q.availableFrom ? ` • ${formatDate(q.availableFrom, true)}` : ""}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lesson.type === "video" && pdfToken && (
            <div className="card mt-5 p-4 sm:p-6">
              <p className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900"><FileText className="size-4 text-rose-500" /> مذكرة الدرس المرفقة</p>
              <PdfViewer mediaToken={pdfToken} watermark={identity} external={pdfExternal} />
            </div>
          )}

          <div className="card mt-5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge tone="brand">{lesson.type === "video" ? "فيديو" : lesson.type === "pdf" ? "ملف" : "اختبار"}</Badge>
                <h1 className="mt-2 font-amin text-xl font-bold text-slate-900">{lesson.title}</h1>
                {lesson.durationMinutes > 0 && <p className="mt-1 text-xs text-slate-500">{lesson.durationMinutes} دقيقة</p>}
              </div>
              {lesson.type !== "quiz" && (
                done.has(lesson.id) ? (
                  <Badge tone="success" className="px-3 py-1.5 text-xs"><CheckCircle2 className="size-4" /> تم الإنهاء</Badge>
                ) : (
                  <form action={markLessonCompleteAction}>
                    <input type="hidden" name="lessonId" value={lesson.id} />
                    <button className="btn btn-success"><CheckCircle2 className="size-4" /> تحديد كمكتمل</button>
                  </form>
                )
              )}
            </div>
            {lesson.description && <p className="prose-ar mt-4 whitespace-pre-line">{lesson.description}</p>}
            <div className="mt-6 flex items-center justify-between border-t border-lav-200 pt-4">
              {prev ? <Link href={`/learn/${slug}/${prev.id}`} className="btn btn-outline btn-sm"><ArrowRight className="size-4" /> السابق</Link> : <span />}
              {next ? <Link href={`/learn/${slug}/${next.id}`} className="btn btn-primary btn-sm">التالي <ArrowLeft className="size-4" /></Link> : <Link href="/dashboard" className="btn btn-accent btn-sm">إنهاء الكورس 🎉</Link>}
            </div>
          </div>
        </main>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
          <div className="card overflow-hidden">
            <div className="border-b border-lav-200 px-4 py-3">
              <p className="text-sm font-black text-slate-900">محتوى الكورس</p>
              <p className="text-[11px] text-slate-500">{openable.filter((l) => done.has(l.id)).length} من {openable.length} درس مكتمل</p>
            </div>
            {units.map((u, ui) => (
              <details key={u.id} open={u.lessons.some((l) => l.id === lesson.id) || ui === 0}>
                <summary className="cursor-pointer bg-lav-50 px-4 py-2.5 text-xs font-black text-slate-700">{ui + 1}. {u.title}</summary>
                <ul>
                  {u.lessons.map((l) => {
                    const Icon = typeIcon[l.type];
                    const open = canOpenLesson(state, l) && !gated.has(l.id);
                    const active = l.id === lesson.id;
                    const inner = (
                      <span className={cn("flex items-center gap-2.5 px-4 py-2.5 text-xs", active ? "bg-brand-50 text-brand-800" : open ? "text-slate-700 hover:bg-lav-50" : "text-slate-400")}>
                        {done.has(l.id) ? <CheckCircle2 className="size-4 shrink-0 text-emerald-500" /> : open ? <Icon className="size-4 shrink-0" /> : <Lock className="size-4 shrink-0" />}
                        <span className="flex-1 leading-5">{l.title}</span>
                        {l.durationMinutes > 0 && <span className="text-[10px] text-slate-500">{l.durationMinutes}د</span>}
                      </span>
                    );
                    return <li key={l.id} className="border-t border-lav-200" title={gated.has(l.id) ? "يُفتح بعد النجاح في الامتحان المرتبط" : undefined}>{open ? <Link href={`/learn/${slug}/${l.id}`}>{inner}</Link> : inner}</li>;
                  })}
                  {exams.filter((q) => q.scope === "unit" && q.unitId === u.id).map((q) => (
                    <li key={q.id} className="border-t border-lav-200 bg-brand-50/40">
                      <Link href={`/quiz/${q.id}`} className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-brand-800 hover:bg-brand-50">
                        <ClipboardCheck className="size-4 shrink-0" />
                        <span className="flex-1 font-bold">امتحان الوحدة: {q.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>

          {exams.some((q) => q.scope === "course") && (state.full || user.role !== "student") && (
            <div className="card overflow-hidden">
              <div className="border-b border-lav-200 px-4 py-3"><p className="flex items-center gap-2 text-sm font-black text-slate-900"><CalendarClock className="size-4 text-peach-500" /> الامتحانات الشاملة</p></div>
              <ul className="divide-y divide-lav-200">
                {exams.filter((q) => q.scope === "course").map((q) => (
                  <li key={q.id}>
                    <Link href={`/quiz/${q.id}`} className="block px-4 py-2.5 text-xs hover:bg-lav-50">
                      <span className="block font-bold text-slate-800">{q.title}</span>
                      <span className="text-[10px] text-slate-500">{q.availableFrom ? `يفتح ${formatDate(q.availableFrom, true)}` : "متاح الآن"} • {q.durationMinutes} د</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
