"use client";

import { useActionState, useState } from "react";
import { Bot, CalendarClock, Link as LinkIcon, Plus, Save, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import {
  adminResetPasswordAction,
  createAnnouncementAction,
  createCourseAction,
  createLessonAction,
  createQuestionAction,
  createQuizFromJsonAction,
  createStandaloneQuizAction,
  createTestimonialAction,
  createUnitAction,
  generateCodesAction,
  importQuestionsAction,
  updateCourseAction,
  updateLessonAction,
  updateQuestionAction,
  updateAiSettingsAction,
  updateBunnySettingsAction,
  testBunnyAction,
  updateQuizAction,
  updateSettingsAction,
  updateSiteImagesAction,
  updateSupportSettingsAction,
  testAiAction,
  type AdminState,
} from "@/actions/admin";
import { Uploader } from "@/components/uploader";
import { VideoUploader } from "@/components/admin/video-uploader";
import { YouTubeField } from "@/components/admin/youtube-field";
import { toLocalInputValue } from "@/lib/utils";
import { Checkbox, Field, FormMessage, Input, Select, Textarea } from "@/components/ui";
import { CopyButton, SubmitButton } from "@/components/ui-client";
import { GRADES, GRADE_KEYS } from "@/lib/utils";
import type { Course, Lesson, Question, Quiz } from "@/db/schema";
import type { SiteSettings } from "@/lib/settings";
import { ANIMATION_PRESET_LABELS, ANIMATION_PRESETS } from "@/lib/animation";
import type { SupportConfig } from "@/lib/support";

/* ───────────── Courses ───────────── */

export function CourseForm({ course }: { course?: Course }) {
  const [state, action] = useActionState(course ? updateCourseAction : createCourseAction, null);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      {course && <input type="hidden" name="courseId" value={course.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="اسم الكورس" name="title" error={e.title} className="sm:col-span-2"><Input id="title" name="title" required minLength={3} maxLength={120} defaultValue={course?.title} placeholder="مثال: الصف الثالث الثانوي – الكهربية" /></Field>
        <Field label="الصف الدراسي" name="grade" error={e.grade}>
          <Select id="grade" name="grade" required defaultValue={course?.grade ?? "third_secondary"}>
            {GRADE_KEYS.map((g) => <option key={g} value={g}>{GRADES[g].label}</option>)}
          </Select>
        </Field>
        <Field label="رابط صورة الغلاف (اختياري)" name="coverImage" error={e.coverImage} hint="أو ارفع صورة من جهازك بالأسفل"><Input id="coverImage" name="coverImage" defaultValue={course?.coverImage ?? ""} dir="ltr" placeholder="https://..." /></Field>
        <div className="sm:col-span-2"><Uploader name="coverFileId" kind="image" label="رفع صورة الغلاف من جهازك" hint="JPG / PNG / WEBP – الأفضل 1280×720" defaultUrl={course?.coverImage?.startsWith("/api/files/") ? course.coverImage : null} /></div>
        <Field label="السعر (ج.م)" name="price" error={e.price}><Input id="price" name="price" type="number" min={0} required defaultValue={course?.price ?? 0} dir="ltr" /></Field>
        <Field label="سعر بعد الخصم (اختياري)" name="discountPrice" error={e.discountPrice}><Input id="discountPrice" name="discountPrice" type="number" min={0} defaultValue={course?.discountPrice ?? ""} dir="ltr" /></Field>
        <Field label="مدة الوصول بالأيام (0 = غير محدودة)" name="accessDays"><Input id="accessDays" name="accessDays" type="number" min={0} defaultValue={course?.accessDays ?? 0} dir="ltr" /></Field>
        <Field label="ترتيب العرض" name="orderIndex"><Input id="orderIndex" name="orderIndex" type="number" min={0} defaultValue={course?.orderIndex ?? 0} dir="ltr" /></Field>
        <Field label="وصف الكورس" name="description" className="sm:col-span-2"><Textarea id="description" name="description" maxLength={3000} defaultValue={course?.description} placeholder="ماذا سيتعلم الطالب في هذا الكورس؟" /></Field>
      </div>
      <div className="rounded-2xl border border-lav-200 bg-lav-50 p-4 text-xs leading-6 text-slate-600">
        <b className="text-slate-900">قاعدة الوصول:</b> الكورس <b>مدفوع</b> افتراضيًا – لا يستطيع الطالب فتح أي درس أو امتحان إلا بعد الدفع وتأكيدك (أو بكود سنتر). لو فعّلت «كورس مجاني» يقدر أي طالب مسجّل تفعيله بضغطة زر. يمكنك أيضًا تحديد حصص «معاينة مجانية» داخل كورس مدفوع من إعدادات كل درس.
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Checkbox name="isPublished" label="منشور" hint="يظهر في الموقع وصفحة الكورسات" defaultChecked={course?.isPublished ?? false} />
        <Checkbox name="isFree" label="كورس مجاني" hint="يُفعّل بدون دفع" defaultChecked={course?.isFree ?? false} />
        <Checkbox name="isFeatured" label="مميز" hint="يظهر في سلايدر الصفحة الرئيسية" defaultChecked={course?.isFeatured ?? false} />
      </div>
      <SubmitButton pendingText="جارٍ الحفظ..."><Save className="size-4" /> {course ? "حفظ التعديلات" : "إنشاء الكورس"}</SubmitButton>
    </form>
  );
}

export function UnitForm({ courseId, nextOrder }: { courseId: string; nextOrder: number }) {
  const [state, action] = useActionState(createUnitAction, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
      <input type="hidden" name="courseId" value={courseId} />
      <Field label="اسم الوحدة / الفصل" name="unit_title"><Input id="unit_title" name="title" required minLength={2} placeholder="مثال: الفصل الأول – التيار الكهربي" /></Field>
      <Field label="الترتيب" name="unit_order"><Input id="unit_order" name="orderIndex" type="number" min={0} defaultValue={nextOrder} className="w-24" dir="ltr" /></Field>
      <SubmitButton className="btn btn-outline" pendingText="..."><Plus className="size-4" /> إضافة وحدة</SubmitButton>
      {state && <div className="sm:col-span-3"><FormMessage state={state} /></div>}
    </form>
  );
}

export function LessonForm({ courseId, units, lesson, defaultUnitId, nextOrder, onDone, bunnyEnabled = false }: {
  courseId: string;
  units: { id: string; title: string }[];
  lesson?: Lesson;
  defaultUnitId?: string;
  nextOrder?: number;
  onDone?: () => void;
  bunnyEnabled?: boolean;
}) {
  const [state, action] = useActionState(lesson ? updateLessonAction : createLessonAction, null);
  const [type, setType] = useState<string>(lesson?.type ?? "video");
  const [videoMode, setVideoMode] = useState<"youtube" | "other" | "upload">(
    lesson?.videoProvider === "bunny" ? "upload" : lesson?.videoProvider && lesson.videoProvider !== "youtube" ? "other" : "youtube",
  );
  if (state?.ok && onDone) onDone();
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-slate-200 bg-white-2/60 p-4">
      <FormMessage state={state} />
      <input type="hidden" name="courseId" value={courseId} />
      {lesson && <input type="hidden" name="lessonId" value={lesson.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="عنوان الدرس" name="l_title" className="sm:col-span-2"><Input id="l_title" name="title" required minLength={2} defaultValue={lesson?.title} placeholder="مثال: قانون أوم للدائرة المغلقة" /></Field>
        <Field label="الوحدة" name="l_unit">
          <Select id="l_unit" name="unitId" required defaultValue={lesson?.unitId ?? defaultUnitId ?? units[0]?.id}>
            {units.map((u) => <option key={u.id} value={u.id}>{u.title}</option>)}
          </Select>
        </Field>
        <Field label="نوع الدرس" name="l_type">
          <Select id="l_type" name="type" value={type} onChange={(ev) => setType(ev.target.value)}>
            <option value="video">فيديو</option>
            <option value="pdf">ملف PDF</option>
            <option value="quiz">اختبار إلكتروني</option>
          </Select>
        </Field>
        {type === "video" && (
          <div className="space-y-3 sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setVideoMode("youtube")} className={`btn btn-sm ${videoMode === "youtube" ? "btn-primary" : "btn-outline"}`}>▶ رابط يوتيوب (غير مدرج) – مجاني وموصى به</button>
              <button type="button" onClick={() => setVideoMode("other")} className={`btn btn-sm ${videoMode === "other" ? "btn-primary" : "btn-outline"}`}>رابط آخر (Vimeo / Drive / Bunny)</button>
              <button type="button" onClick={() => setVideoMode("upload")} className={`btn btn-sm ${videoMode === "upload" ? "btn-primary" : "btn-outline"}`}>رفع من جهازي (Bunny – متقدم)</button>
            </div>
            {videoMode === "youtube" && (
              <>
                <input type="hidden" name="videoProvider" value="youtube" />
                <YouTubeField defaultValue={lesson?.videoProvider === "youtube" ? lesson.videoUrl : ""} />
              </>
            )}
            {videoMode === "other" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="مزود الفيديو" name="l_provider">
                  <Select id="l_provider" name="videoProvider" defaultValue={lesson?.videoProvider && lesson.videoProvider !== "youtube" && lesson.videoProvider !== "bunny" ? lesson.videoProvider : "vimeo"}>
                    <option value="vimeo">Vimeo</option>
                    <option value="drive">Google Drive</option>
                    <option value="bunny">Bunny Stream (رابط embed)</option>
                  </Select>
                </Field>
                <Field label="رابط الفيديو" name="l_video_other" hint="الرابط لا يُرسل أبدًا للطلاب غير المشتركين"><Input id="l_video_other" name="videoUrl" defaultValue={lesson?.videoProvider && lesson.videoProvider !== "youtube" ? lesson.videoUrl ?? "" : ""} dir="ltr" placeholder="https://vimeo.com/..." /></Field>
              </div>
            )}
            {videoMode === "upload" && <VideoUploader enabled={bunnyEnabled} defaultUrl={lesson?.videoProvider === "bunny" ? lesson.videoUrl : null} titleHint={lesson?.title} />}
          </div>
        )}
        {type !== "quiz" && (
          <>
            <Field label="رابط ملف PDF (اختياري)" name="l_pdf" hint="أو ارفع الملف مباشرة من الأسفل"><Input id="l_pdf" name="pdfUrl" defaultValue={lesson?.pdfUrl ?? ""} dir="ltr" placeholder="https://drive.google.com/file/d/.../view" /></Field>
            <Uploader name="pdfFileId" kind="pdf" label="رفع ملف PDF من جهازك" hint="يُحفظ على المنصة ويُعرض للطلاب المصرح لهم فقط" defaultUrl={lesson?.pdfUrl?.startsWith("/api/files/") ? lesson.pdfUrl : null} />
          </>
        )}
        <Field label={type === "quiz" ? "مدة الامتحان (دقيقة)" : "المدة (دقيقة)"} name="l_duration"><Input id="l_duration" name="durationMinutes" type="number" min={0} defaultValue={lesson?.durationMinutes ?? (type === "quiz" ? 20 : 0)} dir="ltr" /></Field>
        <Field label="الترتيب" name="l_order"><Input id="l_order" name="orderIndex" type="number" min={0} defaultValue={lesson?.orderIndex ?? nextOrder ?? 0} dir="ltr" /></Field>
        <Field label="وصف الدرس (اختياري)" name="l_desc" className="sm:col-span-2"><Textarea id="l_desc" name="description" className="min-h-20" defaultValue={lesson?.description ?? ""} /></Field>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Checkbox name="isFreePreview" label="حصة مجانية (معاينة)" hint="متاحة لغير المشتركين" defaultChecked={lesson?.isFreePreview ?? false} />
        <Checkbox name="isPublished" label="منشور" defaultChecked={lesson?.isPublished ?? true} />
      </div>
      <SubmitButton className="btn btn-primary btn-sm" pendingText="جارٍ الحفظ..."><Save className="size-3.5" /> {lesson ? "حفظ الدرس" : "إضافة الدرس"}</SubmitButton>
    </form>
  );
}

/* ───────────── Quiz ───────────── */

export type QuizTree = { id: string; title: string; lessons: { id: string; title: string; type: string }[] }[];

function QuizLinkage({ tree, quiz }: { tree: QuizTree; quiz?: Quiz }) {
  const [scope, setScope] = useState<"course" | "unit" | "lesson">(quiz?.scope ?? "course");
  const [unitId, setUnitId] = useState<string>(quiz?.unitId ?? "");
  const [lessonId, setLessonId] = useState<string>(quiz?.lessonId ?? "");
  const unit = tree.find((u) => u.id === unitId);
  const lessonPool = unitId ? (unit?.lessons ?? []) : tree.flatMap((u) => u.lessons);
  const allLessons = tree.flatMap((u) => u.lessons.map((l) => ({ ...l, unitTitle: u.title })));
  return (
    <div className="rounded-2xl border border-lav-200 bg-lav-50 p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800"><LinkIcon className="size-4 text-brand-500" /> ربط الامتحان – على إيه بالظبط؟</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {([
          ["course", "شامل على الكورس كله", "يظهر في صفحة الامتحانات وصفحة الكورس"],
          ["unit", "على وحدة / فصل", "يظهر داخل الوحدة المحددة"],
          ["lesson", "على درس محدد", "يظهر داخل صفحة الدرس نفسه"],
        ] as const).map(([v, t, h]) => (
          <label key={v} className={`cursor-pointer rounded-2xl border-2 p-3 transition ${scope === v ? "border-brand-500 bg-white" : "border-lav-200 bg-white/60 hover:border-brand-300"}`}>
            <input type="radio" name="scope" value={v} checked={scope === v} onChange={() => setScope(v)} className="sr-only" />
            <span className="block text-sm font-bold text-slate-900">{t}</span>
            <span className="block text-[11px] text-slate-500">{h}</span>
          </label>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {scope !== "course" && (
          <Field label={scope === "unit" ? "الوحدة / الفصل" : "الوحدة (لتصفية الدروس)"} name="q_unit">
            <Select id="q_unit" name="unitId" required={scope === "unit"} value={unitId} onChange={(e) => { setUnitId(e.target.value); setLessonId(""); }}>
              <option value="">{scope === "unit" ? "اختر الوحدة" : "كل الوحدات"}</option>
              {tree.map((u) => <option key={u.id} value={u.id}>{u.title} ({u.lessons.length} درس)</option>)}
            </Select>
          </Field>
        )}
        {scope === "lesson" && (
          <Field label="الدرس" name="q_lesson">
            <Select id="q_lesson" name="lessonId" required value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
              <option value="">اختر الدرس</option>
              {lessonPool.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </Select>
          </Field>
        )}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Checkbox name="requireLessonComplete" label={scope === "lesson" ? "يجب إنهاء الدرس أولًا" : scope === "unit" ? "يجب إنهاء كل دروس الوحدة أولًا" : "يجب إنهاء كل دروس الكورس أولًا"} hint="لا يُفتح الامتحان قبل إتمام المحتوى المرتبط" defaultChecked={quiz?.requireLessonComplete ?? false} />
        <Field label="بعد النجاح يُفتح درس (اختياري)" name="q_unlock" hint="تدرّج إجباري: الدرس المختار يبقى مقفولًا حتى ينجح الطالب في هذا الامتحان">
          <Select id="q_unlock" name="unlockLessonId" defaultValue={quiz?.unlockLessonId ?? ""}>
            <option value="">بدون</option>
            {allLessons.map((l) => <option key={l.id} value={l.id}>{l.unitTitle} ← {l.title}</option>)}
          </Select>
        </Field>
      </div>
    </div>
  );
}

function QuizFields({ quiz, tree }: { quiz?: Quiz; tree: QuizTree }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="عنوان الامتحان" name="q_title" className="sm:col-span-3"><Input id="q_title" name="title" required defaultValue={quiz?.title} placeholder="مثال: امتحان شامل على الفصل الأول" /></Field>
        <Field label="المدة (دقيقة)" name="q_dur"><Input id="q_dur" name="durationMinutes" type="number" min={1} max={300} required defaultValue={quiz?.durationMinutes ?? 30} dir="ltr" /></Field>
        <Field label="درجة النجاح %" name="q_pass"><Input id="q_pass" name="passPercent" type="number" min={0} max={100} required defaultValue={quiz?.passPercent ?? 50} dir="ltr" /></Field>
        <Field label="عدد المحاولات" name="q_att"><Input id="q_att" name="maxAttempts" type="number" min={1} max={50} required defaultValue={quiz?.maxAttempts ?? 1} dir="ltr" /></Field>
        <Field label="تعليمات (اختياري)" name="q_desc" className="sm:col-span-3"><Textarea id="q_desc" name="description" className="min-h-20" defaultValue={quiz?.description ?? ""} /></Field>
      </div>

      <QuizLinkage tree={tree} quiz={quiz} />

      <div className="rounded-2xl border border-lav-200 bg-lav-50 p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800"><CalendarClock className="size-4 text-brand-500" /> موعد الامتحان (توقيت القاهرة) – اتركه فارغًا ليكون متاحًا دائمًا</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="يفتح في" name="q_from"><Input id="q_from" name="availableFrom" type="datetime-local" defaultValue={toLocalInputValue(quiz?.availableFrom)} dir="ltr" /></Field>
          <Field label="يغلق في" name="q_until"><Input id="q_until" name="availableUntil" type="datetime-local" defaultValue={toLocalInputValue(quiz?.availableUntil)} dir="ltr" /></Field>
        </div>
      </div>

      <div className="rounded-2xl border border-lav-200 bg-lav-50 p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800"><ShieldCheck className="size-4 text-brand-500" /> نظام منع الغش</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Checkbox name="antiCheat" label="تفعيل منع الغش" hint="الخروج من الصفحة يلغي الامتحان" defaultChecked={quiz?.antiCheat ?? true} />
          <Checkbox name="requireFullscreen" label="إلزام ملء الشاشة" hint="الخروج منه يلغي المحاولة" defaultChecked={quiz?.requireFullscreen ?? true} />
          <Field label="حد المخالفات البسيطة" name="q_viol" hint="نسخ/لصق/كليك يمين..."><Input id="q_viol" name="maxViolations" type="number" min={1} max={20} defaultValue={quiz?.maxViolations ?? 3} dir="ltr" /></Field>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Checkbox name="shuffleQuestions" label="خلط ترتيب الأسئلة" defaultChecked={quiz?.shuffleQuestions ?? true} />
        <Checkbox name="showAnswers" label="إظهار الإجابات بعد التسليم" defaultChecked={quiz?.showAnswers ?? true} />
        <Checkbox name="isPublished" label="منشور" defaultChecked={quiz?.isPublished ?? true} />
      </div>
    </>
  );
}

export function QuizForm({ quiz, tree }: { quiz: Quiz; tree: QuizTree }) {
  const [state, action] = useActionState(updateQuizAction, null);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="quizId" value={quiz.id} />
      <QuizFields quiz={quiz} tree={tree} />
      <SubmitButton pendingText="جارٍ الحفظ..."><Save className="size-4" /> حفظ الإعدادات</SubmitButton>
    </form>
  );
}

export function StandaloneQuizForm({ courseId, tree }: { courseId: string; tree: QuizTree }) {
  const [state, action] = useActionState(createStandaloneQuizAction, null);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="courseId" value={courseId} />
      <QuizFields tree={tree} />
      <SubmitButton pendingText="جارٍ الإنشاء..."><Plus className="size-4" /> إنشاء الامتحان ثم إضافة الأسئلة</SubmitButton>
    </form>
  );
}

export function QuestionForm({ quizId, question }: { quizId: string; question?: Question }) {
  const [state, action] = useActionState(question ? updateQuestionAction : createQuestionAction, null);
  const opts = question?.options ?? ["", "", "", ""];
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-slate-200 bg-white-2/60 p-4">
      <FormMessage state={state} />
      <input type="hidden" name="quizId" value={quizId} />
      {question && <input type="hidden" name="questionId" value={question.id} />}
      <Field label="نص السؤال" name="qs_text"><Textarea id="qs_text" name="text" required className="min-h-20" defaultValue={question?.text} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Field key={i} label={`الاختيار ${["أ", "ب", "ج", "د", "هـ", "و"][i]}${i < 2 ? " *" : ""}`} name={`opt_${i}`}>
            <Input id={`opt_${i}`} name={`option_${i}`} defaultValue={opts[i] ?? ""} required={i < 2} maxLength={300} />
          </Field>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="الإجابة الصحيحة" name="qs_correct">
          <Select id="qs_correct" name="correctIndex" defaultValue={String(question?.correctIndex ?? 0)}>
            {["أ", "ب", "ج", "د", "هـ", "و"].map((l, i) => <option key={i} value={i}>{l}</option>)}
          </Select>
        </Field>
        <Field label="الدرجة" name="qs_points"><Input id="qs_points" name="points" type="number" min={1} max={20} defaultValue={question?.points ?? 1} dir="ltr" /></Field>
        <Field label="رابط صورة (اختياري)" name="qs_img"><Input id="qs_img" name="imageUrl" defaultValue={question?.imageUrl ?? ""} dir="ltr" placeholder="https://..." /></Field>
      </div>
      <Field label="شرح الإجابة (اختياري)" name="qs_exp"><Textarea id="qs_exp" name="explanation" className="min-h-16" defaultValue={question?.explanation ?? ""} /></Field>
      <SubmitButton className="btn btn-primary btn-sm" pendingText="جارٍ الحفظ..."><Save className="size-3.5" /> {question ? "حفظ السؤال" : "إضافة السؤال"}</SubmitButton>
    </form>
  );
}

export const QUIZ_JSON_TEMPLATE = `{
  "title": "امتحان الفصل الأول – قانون أوم",
  "questions": [
    {
      "text": "وحدة قياس المقاومة الكهربائية في النظام الدولي هي:",
      "options": ["الأوم", "الفولت", "الأمبير", "الواط"],
      "correctIndex": 0,
      "explanation": "المقاومة تُقاس بالأوم (Ω) وقانونها R = V/I",
      "points": 1
    },
    {
      "text": "إذا تضاعف فرق الجهد عند ثبات المقاومة فإن التيار:",
      "options": ["يتضاعف", "يقل للنصف", "لا يتغير", "يصبح صفرًا"],
      "correctIndex": 0,
      "explanation": "من قانون أوم I = V/R فالتيار يتناسب طرديًا مع الجهد",
      "points": 1
    }
  ]
}`;

/**
 * AI Quiz Generator – one-step creation from the exams page:
 * choose the course, paste the JSON (or upload a .json file) and the exam is
 * built with its questions and automatic grading right away.
 */
export function AiQuizFromJsonForm({ courses }: { courses: { id: string; title: string }[] }) {
  const [state, action] = useActionState(createQuizFromJsonAction, null);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 text-xs leading-6 text-slate-700 dark:border-brand-300/40 dark:bg-brand-50/20 dark:text-slate-800">
        <p className="text-sm font-black text-slate-900 dark:text-white">🤖 امتحان كامل في ثوانٍ بالذكاء الاصطناعي</p>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>انسخ القالب الجاهز وضعه في ChatGPT أو Gemini مع اسم الموضوع.</li>
          <li>ارجع هنا والصق الـ JSON (أو ارفع ملف .json).</li>
          <li>اختر الكورس واضغط «إنشاء الامتحان» — يتكوّن بالتصحيح التلقائي فورًا.</li>
        </ol>
        <div className="mt-3"><CopyButton text={QUIZ_JSON_TEMPLATE} label="نسخ قالب JSON الجاهز" /></div>
      </div>
      <form action={action} className="space-y-3">
        <FormMessage state={state} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="الكورس" name="aiq_course">
            <Select id="aiq_course" name="courseId" required defaultValue={courses[0]?.id}>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </Field>
          <Field label="عنوان الامتحان (اختياري – يُستخدم عنوان JSON إن وجد)" name="aiq_title">
            <Input id="aiq_title" name="title" maxLength={150} placeholder="امتحان الفصل الأول" />
          </Field>
        </div>
        <Field label="الصق JSON هنا" name="aiq_json" hint="لو الملف كبير: ارفع ملف .json من الأسفل بدلًا من اللصق">
          <Textarea id="aiq_json" name="json" dir="ltr" className="min-h-52 font-mono text-[11px] leading-5" placeholder={QUIZ_JSON_TEMPLATE} />
        </Field>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-3">
          <label className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
            أو ارفع ملف ‎.json‎:
            <input type="file" name="jsonFile" accept=".json,application/json" className="text-xs file:me-2 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-brand-700" />
          </label>
        </div>
        <SubmitButton className="btn btn-accent" pendingText="جارٍ إنشاء الامتحان..."><Sparkles className="size-4" /> إنشاء الامتحان الآن</SubmitButton>
      </form>
    </div>
  );
}

export function BulkQuestionsForm({ quizId }: { quizId: string }) {
  const [state, action] = useActionState(importQuestionsAction, null);
  const [mode, setMode] = useState<"text" | "json">("text");
  const example = `1. وحدة قياس القوة في النظام الدولي هي:
أ) الجول
ب) النيوتن *
ج) الواط
د) الباسكال
شرح: القوة = الكتلة × العجلة ووحدتها kg·m/s²

2. أي من الكميات التالية كمية أساسية؟
أ) السرعة
ب) الكثافة
ج) الزمن
د) القوة
الإجابة: ج`;
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="quizId" value={quizId} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode("text")} className={`btn btn-sm ${mode === "text" ? "btn-primary" : "btn-outline"}`}>📄 لصق نص (Word)</button>
        <button type="button" onClick={() => setMode("json")} className={`btn btn-sm ${mode === "json" ? "btn-primary" : "btn-outline"}`}><Sparkles className="size-3.5" /> توليد بالذكاء الاصطناعي (JSON)</button>
        {mode === "json" && <CopyButton text={QUIZ_JSON_TEMPLATE} label="نسخ القالب JSON الجاهز" />}
      </div>

      {mode === "text" ? (
        <Field label="الصق الأسئلة هنا (سؤال في كل كتلة، وسطر فارغ بين الأسئلة)" name="bulk_text" hint="حدّد الإجابة الصحيحة بنجمة * بعد الاختيار أو بسطر «الإجابة: ب». سطر «شرح:» اختياري.">
          <Textarea id="bulk_text" name="text" required className="min-h-56 font-mono text-xs leading-6" placeholder={example} dir="rtl" />
        </Field>
      ) : (
        <Field
          label="الصق كود JSON من ChatGPT أو Gemini"
          name="bulk_json"
          hint="انسخ القالب الجاهز أعلاه وأعطِه لأي ذكاء اصطناعي مع طلب توليد أسئلة بالتنسيق نفسه، ثم الصق الناتج هنا – سيُنشأ الامتحان بالكامل بالتصحيح التلقائي في ثوانٍ."
        >
          <Textarea id="bulk_json" name="text" required className="min-h-56 font-mono text-[11px] leading-6" placeholder={QUIZ_JSON_TEMPLATE} dir="ltr" />
        </Field>
      )}

      <div className="grid gap-3 sm:grid-cols-[160px_1fr] sm:items-end">
        <Field label="درجة كل سؤال (افتراضي)" name="bulk_points"><Input id="bulk_points" name="points" type="number" min={1} max={20} defaultValue={1} dir="ltr" /></Field>
        <SubmitButton className="btn btn-accent" pendingText="جارٍ الاستيراد...">
          <Wand2 className="size-4" /> {mode === "json" ? "توليد الامتحان بالكامل بالتصحيح التلقائي" : "استيراد الأسئلة دفعة واحدة"}
        </SubmitButton>
      </div>
    </form>
  );
}

/* ───────────── Codes ───────────── */

export type CodeTree = { id: string; title: string; units: { id: string; title: string; lessons: { id: string; title: string }[] }[] }[];

export function CodesForm({ tree }: { tree: CodeTree }) {
  const [state, action] = useActionState(generateCodesAction, null);
  const [scope, setScope] = useState<"course" | "unit" | "lesson">("course");
  const [courseId, setCourseId] = useState(tree[0]?.id ?? "");
  const [unitId, setUnitId] = useState("");
  const course = tree.find((c) => c.id === courseId);
  const units = course?.units ?? [];
  const lessonsList = (unitId ? units.find((u) => u.id === unitId)?.lessons : units.flatMap((u) => u.lessons)) ?? [];
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <FormMessage state={state} />
        <div className="grid gap-3 sm:grid-cols-3">
          {([
            ["course", "كورس كامل", "يفتح كل دروس الكورس"],
            ["unit", "وحدة / فصل", "يفتح دروس وحدة واحدة فقط"],
            ["lesson", "درس واحد", "يفتح درسًا محددًا فقط"],
          ] as const).map(([v, t, h]) => (
            <label key={v} className={`cursor-pointer rounded-2xl border-2 p-3 transition ${scope === v ? "border-brand-500 bg-brand-50" : "border-lav-200 bg-white hover:border-brand-300"}`}>
              <input type="radio" name="scope" value={v} checked={scope === v} onChange={() => setScope(v)} className="sr-only" />
              <span className="block text-sm font-bold text-slate-900">{t}</span>
              <span className="block text-[11px] text-slate-500">{h}</span>
            </label>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="الكورس" name="c_course">
            <Select id="c_course" name="courseId" required value={courseId} onChange={(e) => { setCourseId(e.target.value); setUnitId(""); }}>
              {tree.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </Field>
          {scope !== "course" && (
            <Field label={scope === "unit" ? "الوحدة" : "الوحدة (لتصفية الدروس)"} name="c_unit">
              <Select id="c_unit" name="unitId" required={scope === "unit"} value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="">{scope === "unit" ? "اختر الوحدة" : "كل الوحدات"}</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.title}</option>)}
              </Select>
            </Field>
          )}
          {scope === "lesson" && (
            <Field label="الدرس" name="c_lesson">
              <Select id="c_lesson" name="lessonId" required defaultValue="">
                <option value="" disabled>اختر الدرس</option>
                {lessonsList.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </Select>
            </Field>
          )}
          <Field label="عدد الأكواد" name="c_qty"><Input id="c_qty" name="quantity" type="number" min={1} max={500} required defaultValue={20} dir="ltr" /></Field>
          <Field label="اسم الدفعة / السنتر" name="c_batch" hint="مثال: سنتر النور – مجموعة السبت"><Input id="c_batch" name="batch" maxLength={60} /></Field>
          <Field label="صلاحية الكود بالأيام (0 = بدون)" name="c_exp" hint="آخر موعد لاستخدام الكود"><Input id="c_exp" name="expiresInDays" type="number" min={0} defaultValue={0} dir="ltr" /></Field>
          <Field label="مدة الوصول بالأيام (0 = حسب الكورس)" name="c_access" hint="مدة فتح المحتوى بعد التفعيل"><Input id="c_access" name="accessDays" type="number" min={0} defaultValue={0} dir="ltr" /></Field>
        </div>
        <SubmitButton className="btn btn-accent" pendingText="جارٍ التوليد..."><Wand2 className="size-4" /> توليد الأكواد</SubmitButton>
      </form>
      {state?.codes && state.codes.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-black text-emerald-800">الأكواد الجديدة ({state.codes.length}) – انسخها أو اطبعها الآن</p>
            <div className="flex gap-2">
              <CopyButton text={state.codes.join("\n")} label="نسخ الكل" />
              <button type="button" onClick={() => window.print()} className="btn btn-outline btn-sm">طباعة</button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
            {state.codes.map((c) => (
              <div key={c} className="rounded-xl border border-dashed border-emerald-300 bg-white px-3 py-2 text-center font-mono text-sm font-bold tracking-widest text-slate-900" dir="ltr">{c}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────── Bunny Stream settings ───────────── */

export function BunnySettingsForm({ values, maskedKey }: { values: { bunny_library_id: string; bunny_cdn_hostname: string }; maskedKey: string }) {
  const [state, action] = useActionState(updateBunnySettingsAction, null);
  const [testState, testAction] = useActionState(testBunnyAction, null);
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <FormMessage state={state} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Library ID" name="bunny_library_id" hint="من Bunny → Stream → المكتبة → API"><Input id="bunny_library_id" name="bunny_library_id" defaultValue={values.bunny_library_id} dir="ltr" placeholder="123456" /></Field>
          <Field label="Stream API Key" name="bunny_api_key" hint={maskedKey ? `الحالي: ${maskedKey} – اتركه فارغًا للإبقاء، أو اكتب clear لحذفه` : "مفتاح المكتبة (ليس مفتاح الحساب)"}><Input id="bunny_api_key" name="bunny_api_key" type="password" autoComplete="off" dir="ltr" placeholder={maskedKey ? "••••••••" : "xxxxxxxx-xxxx-xxxx"} /></Field>
          <Field label="CDN Hostname (اختياري)" name="bunny_cdn_hostname" hint="للصور المصغّرة – مثال vz-xxxx.b-cdn.net"><Input id="bunny_cdn_hostname" name="bunny_cdn_hostname" defaultValue={values.bunny_cdn_hostname} dir="ltr" /></Field>
        </div>
        <SubmitButton pendingText="جارٍ الحفظ..."><Save className="size-4" /> حفظ إعدادات Bunny</SubmitButton>
      </form>
      <form action={testAction} className="flex flex-wrap items-center gap-3 rounded-2xl border border-lav-200 bg-lav-50 p-4">
        <SubmitButton className="btn btn-outline" pendingText="جارٍ الاختبار..."><Sparkles className="size-4" /> اختبار الاتصال بـ Bunny</SubmitButton>
        <div className="flex-1"><FormMessage state={testState} /></div>
      </form>
    </div>
  );
}

/* ───────────── AI settings ───────────── */

export function AiSettingsForm({ values, maskedKey }: { values: { ai_provider: string; ai_model: string; ai_auto_approve: string; ai_min_confidence: string }; maskedKey: string }) {
  const [state, action] = useActionState(updateAiSettingsAction, null);
  const [testState, testAction] = useActionState(testAiAction, null);
  const [provider, setProvider] = useState(values.ai_provider || "none");
  const defaultModel = provider === "gemini" ? "gemini-2.0-flash" : provider === "openai" ? "gpt-4o-mini" : "";
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <FormMessage state={state} />
        <div className="grid gap-3 sm:grid-cols-3">
          {([
            ["none", "معطّل", "مراجعة يدوية فقط"],
            ["gemini", "Google Gemini", "مجاني للاستخدام الخفيف – يقرأ الصور بدقة"],
            ["openai", "OpenAI (ChatGPT)", "GPT-4o mini / GPT-4o"],
          ] as const).map(([v, t, h]) => (
            <label key={v} className={`cursor-pointer rounded-2xl border-2 p-3 transition ${provider === v ? "border-brand-500 bg-brand-50" : "border-lav-200 bg-white hover:border-brand-300"}`}>
              <input type="radio" name="ai_provider" value={v} checked={provider === v} onChange={() => setProvider(v)} className="sr-only" />
              <span className="flex items-center gap-2 text-sm font-bold text-slate-900"><Bot className="size-4 text-brand-500" /> {t}</span>
              <span className="block text-[11px] text-slate-500">{h}</span>
            </label>
          ))}
        </div>
        {provider !== "none" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="اسم النموذج" name="ai_model" hint={`اتركه فارغًا لاستخدام ${defaultModel}`}><Input id="ai_model" name="ai_model" defaultValue={values.ai_model} placeholder={defaultModel} dir="ltr" /></Field>
            <Field label="مفتاح API" name="ai_api_key" hint={maskedKey ? `المفتاح الحالي: ${maskedKey} – اتركه فارغًا للإبقاء عليه، أو اكتب clear لحذفه` : "يُحفظ على الخادم فقط ولا يظهر للمتصفح"}>
              <Input id="ai_api_key" name="ai_api_key" type="password" autoComplete="off" placeholder={maskedKey ? "••••••••" : provider === "gemini" ? "AIza..." : "sk-..."} dir="ltr" />
            </Field>
            <Field label="الحد الأدنى لدرجة الثقة % (للقبول الآلي)" name="ai_min_confidence"><Input id="ai_min_confidence" name="ai_min_confidence" type="number" min={50} max={100} defaultValue={values.ai_min_confidence || "85"} dir="ltr" /></Field>
            <div className="self-end"><Checkbox name="ai_auto_approve" label="تفعيل الكورس تلقائيًا عند نجاح التحقق" hint="فقط إذا تطابق المبلغ ورقم المستلم والمرجع ولم تُرصد أي علامات تلاعب" defaultChecked={values.ai_auto_approve === "true"} /></div>
          </div>
        )}
        <SubmitButton pendingText="جارٍ الحفظ..."><Save className="size-4" /> حفظ الإعدادات</SubmitButton>
      </form>
      {provider !== "none" && (
        <form action={testAction} className="flex flex-wrap items-center gap-3 rounded-2xl border border-lav-200 bg-lav-50 p-4">
          <SubmitButton className="btn btn-outline" pendingText="جارٍ الاختبار..."><Sparkles className="size-4" /> اختبار الاتصال بالنموذج</SubmitButton>
          <div className="flex-1"><FormMessage state={testState} /></div>
        </form>
      )}
    </div>
  );
}

/* ───────────── Announcements ───────────── */

export function AnnouncementForm() {
  const [state, action] = useActionState(createAnnouncementAction, null);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <Field label="عنوان الإعلان" name="a_title"><Input id="a_title" name="title" required minLength={2} maxLength={150} /></Field>
        <Field label="الفئة المستهدفة" name="a_grade">
          <Select id="a_grade" name="grade" defaultValue="all">
            <option value="all">جميع الصفوف</option>
            {GRADE_KEYS.map((g) => <option key={g} value={g}>{GRADES[g].label}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="نص الإعلان" name="a_body"><Textarea id="a_body" name="body" required minLength={2} maxLength={4000} /></Field>
      <Checkbox name="isPinned" label="تثبيت الإعلان في الأعلى" />
      <SubmitButton pendingText="جارٍ النشر..."><Plus className="size-4" /> نشر الإعلان</SubmitButton>
    </form>
  );
}

/* ───────────── Site images ───────────── */

const IMAGE_SLOTS: Array<{ key: "img_hero" | "img_about" | "img_feature_1" | "img_feature_2" | "img_feature_3" | "img_auth" | "img_login" | "img_register" | "site_logo" | "site_favicon"; label: string; hint: string }> = [
  { key: "img_hero", label: "صورة الهيدر (أعلى الصفحة الرئيسية)", hint: "الأفضل مربعة 900×900 – تظهر داخل إطار مقوّس" },
  { key: "img_about", label: "صورة قسم «عن المستر»", hint: "الأفضل PNG بخلفية شفافة (قصاصة واقف) – تظهر على كارت متدرّج" },
  { key: "img_feature_1", label: "كارت 1: تنظيم الدروس والوحدات", hint: "مربعة أو طولية 4:5" },
  { key: "img_feature_2", label: "كارت 2: دروس بالفيديو والصور التوضيحية", hint: "مربعة أو طولية 4:5" },
  { key: "img_feature_3", label: "كارت 3: اختبارات وتقييم مستمر", hint: "مربعة أو طولية 4:5" },
  { key: "img_auth", label: "صورة صفحات تسجيل الدخول / إنشاء الحساب (افتراضية)", hint: "طولية – تظهر مع الرسالة التحفيزية" },
  { key: "img_login", label: "صورة صفحة تسجيل الدخول", hint: "طولية – فارغة = نفس الصورة الافتراضية" },
  { key: "img_register", label: "صورة صفحة إنشاء الحساب", hint: "طولية – فارغة = نفس الصورة الافتراضية" },
  { key: "site_logo", label: "لوجو الموقع", hint: "شفافة PNG – فارغة = الشعار الافتراضي" },
  { key: "site_favicon", label: "أيقونة المتصفح (Favicon)", hint: "مربعة صغيرة – ICO/PNG" },
];

export function SiteImagesForm({ values }: { values: Record<(typeof IMAGE_SLOTS)[number]["key"], string> & { auth_quote: string; auth_quote_author: string } }) {
  const [state, action] = useActionState(updateSiteImagesAction, null);
  return (
    <form action={action} className="space-y-6">
      <FormMessage state={state} />
      <div className="grid gap-5 md:grid-cols-2">
        {IMAGE_SLOTS.map((slot) => (
          <div key={slot.key} className="rounded-2xl border border-lav-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-3">
              {values[slot.key] ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={values[slot.key]} alt="" className="size-16 shrink-0 rounded-xl border border-lav-200 bg-lav-50 object-cover" />
              ) : (
                <span className="grid size-16 shrink-0 place-items-center rounded-xl border border-dashed border-lav-300 bg-lav-50 text-[10px] font-bold text-slate-400">بدون صورة</span>
              )}
              <div>
                <p className="text-sm font-bold text-slate-900">{slot.label}</p>
                <p className="text-[11px] text-slate-500">{slot.hint}</p>
              </div>
            </div>
            <Uploader name={`${slot.key}_file`} kind="image" label="رفع صورة جديدة من جهازك" hint="JPG / PNG / WEBP حتى 4 ميجابايت" />
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" name={`${slot.key}_reset`} className="size-3.5 accent-[#7c5cff]" /> إرجاع الصورة الافتراضية</label>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-lav-200 bg-lav-50 p-4">
        <p className="mb-3 text-sm font-bold text-slate-900">الرسالة التحفيزية في صفحات الدخول / التسجيل</p>
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <Field label="نص الرسالة" name="auth_quote"><Textarea id="auth_quote" name="auth_quote" maxLength={300} className="min-h-20" defaultValue={values.auth_quote} /></Field>
          <Field label="التوقيع" name="auth_quote_author"><Input id="auth_quote_author" name="auth_quote_author" maxLength={80} defaultValue={values.auth_quote_author} /></Field>
        </div>
      </div>
      <SubmitButton pendingText="جارٍ الحفظ..."><Save className="size-4" /> حفظ الصور والرسالة</SubmitButton>
    </form>
  );
}

/* ───────────── Testimonials ───────────── */

export function TestimonialForm() {
  const [state, action] = useActionState(createTestimonialAction, null);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="الاسم" name="t_name"><Input id="t_name" name="name" required minLength={2} maxLength={60} placeholder="مثال: محمد أحمد" /></Field>
        <Field label="الصفة" name="t_role" hint="مثال: طالب – 3 ثانوي / ولي أمر"><Input id="t_role" name="role" maxLength={60} /></Field>
        <Field label="الصف الدراسي" name="t_grade">
          <Select id="t_grade" name="grade" defaultValue="none">
            <option value="none">غير محدد</option>
            {GRADE_KEYS.map((g) => <option key={g} value={g}>{GRADES[g].label}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="نص الرأي" name="t_text"><Textarea id="t_text" name="text" required minLength={10} maxLength={600} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="التقييم (نجوم)" name="t_stars">
          <Select id="t_stars" name="stars" defaultValue="5">
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ⭐</option>)}
          </Select>
        </Field>
        <Field label="رابط صورة (اختياري)" name="t_avatar"><Input id="t_avatar" name="avatarUrl" dir="ltr" placeholder="https://..." /></Field>
        <Field label="الترتيب" name="t_order"><Input id="t_order" name="orderIndex" type="number" min={0} defaultValue={0} dir="ltr" /></Field>
      </div>
      <SubmitButton pendingText="جارٍ الحفظ..."><Plus className="size-4" /> إضافة الرأي</SubmitButton>
    </form>
  );
}

/* ───────────── Students ───────────── */

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(adminResetPasswordAction, null);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="userId" value={userId} />
      <Field label="كلمة مرور جديدة" name="r_pw" hint="سيُطلب من الطالب تغييرها عند الدخول"><Input id="r_pw" name="newPassword" required minLength={8} dir="ltr" placeholder="8 أحرف على الأقل، حروف وأرقام" /></Field>
      <SubmitButton className="btn btn-danger btn-sm" pendingText="...">إعادة تعيين كلمة المرور</SubmitButton>
    </form>
  );
}

/* ───────────── Settings ───────────── */

const SETTINGS_FIELDS: Array<{ key: keyof SiteSettings; label: string; type?: "text" | "textarea" | "number" | "select" | "plan_select" | "color" | "anim_select"; hint?: string; group: string; dir?: "ltr" }> = [
  { key: "theme_primary", label: "اللون الرئيسي", type: "color", group: "الثيم والحركة", dir: "ltr" },
  { key: "theme_secondary", label: "اللون الفرعي", type: "color", group: "الثيم والحركة", dir: "ltr" },
  { key: "theme_bg_light", label: "لون خلفية الوضع الفاتح", type: "color", group: "الثيم والحركة", dir: "ltr" },
  { key: "theme_bg_dark", label: "لون خلفية الوضع الداكن", type: "color", group: "الثيم والحركة", dir: "ltr" },
  { key: "animation_preset", label: "نمط حركة العناصر (يُطبق على الموقع كله فورًا)", type: "anim_select", group: "الثيم والحركة" },
  { key: "site_name", label: "اسم المنصة", group: "الهوية" },
  { key: "teacher_name", label: "اسم المدرس", group: "الهوية" },
  { key: "tagline", label: "الشعار القصير", group: "الهوية" },
  { key: "hero_badge", label: "شارة الهيرو", group: "الهوية" },
  { key: "hero_title", label: "عنوان الهيرو", hint: "استخدم (..) للفصل بين السطور الثلاثة", group: "الهوية" },
  { key: "hero_welcome", label: "جملة الترحيب في الهيرو", group: "الهوية" },
  { key: "academic_year", label: "العام الدراسي (يظهر في عنوان الكورسات)", group: "الهوية", dir: "ltr" },
  { key: "hero_subtitle", label: "وصف الهيرو", type: "textarea", group: "الهوية" },
  { key: "about_bio", label: "رسالة المدرس (الصندوق الأحمر في قسم عن المدرس)", type: "textarea", group: "الهوية" },
  { key: "footer_text", label: "نص الفوتر", type: "textarea", group: "الهوية" },
  { key: "announcement_bar", label: "شريط إعلان أعلى الموقع (اتركه فارغًا للإخفاء)", group: "الهوية" },
  { key: "youtube_followers", label: "متابعين اليوتيوب (عدّاد الهيرو)", type: "number", group: "الإحصائيات", dir: "ltr" },
  { key: "facebook_followers", label: "متابعين الفيسبوك (عدّاد الهيرو)", type: "number", group: "الإحصائيات", dir: "ltr" },
  { key: "students_count", label: "عدد الطلاب", type: "number", group: "الإحصائيات", dir: "ltr" },
  { key: "videos_count", label: "عدد الفيديوهات", type: "number", group: "الإحصائيات", dir: "ltr" },
  { key: "exams_count", label: "عدد الامتحانات", type: "number", group: "الإحصائيات", dir: "ltr" },
  { key: "success_rate", label: "نسبة النجاح %", type: "number", group: "الإحصائيات", dir: "ltr" },
  { key: "whatsapp", label: "رقم واتساب (بصيغة دولية 2010xxxxxxxx)", group: "التواصل", dir: "ltr" },
  { key: "phone", label: "رقم الهاتف", group: "التواصل", dir: "ltr" },
  { key: "facebook", label: "رابط فيسبوك", group: "التواصل", dir: "ltr" },
  { key: "instagram", label: "رابط انستجرام", group: "التواصل", dir: "ltr" },
  { key: "youtube", label: "رابط يوتيوب", group: "التواصل", dir: "ltr" },
  { key: "telegram", label: "رابط تيليجرام", group: "التواصل", dir: "ltr" },
  { key: "tiktok", label: "رابط تيك توك", group: "التواصل", dir: "ltr" },
  { key: "vodafone_cash_number", label: "رقم فودافون كاش", group: "الدفع", dir: "ltr" },
  { key: "instapay_address", label: "عنوان إنستاباي", group: "الدفع", dir: "ltr" },
  { key: "payment_instructions", label: "تعليمات الدفع", type: "textarea", group: "الدفع" },
  { key: "pricing_enabled", label: "إظهار قسم الباقات في الصفحة الرئيسية", type: "select", group: "خطط الاشتراك" },
  { key: "pricing_title", label: "عنوان القسم (آخر كلمة تُلوَّن)", group: "خطط الاشتراك" },
  { key: "pricing_subtitle", label: "وصف القسم", type: "textarea", group: "خطط الاشتراك" },
  { key: "plan_period", label: "فترة الاشتراك (مثال: شهريًا / للترم / للسنة)", group: "خطط الاشتراك" },
  { key: "plan_popular", label: "الباقة المميزة (تظهر بشارة «الأكثر اختيارًا»)", type: "plan_select", group: "خطط الاشتراك" },
  { key: "plan_basic_name", label: "الباقة 1 – الاسم (اتركه فارغًا لإخفائها)", group: "خطط الاشتراك" },
  { key: "plan_basic_tagline", label: "الباقة 1 – الوصف القصير", group: "خطط الاشتراك" },
  { key: "plan_basic_price", label: "الباقة 1 – السعر (جنيه)", type: "number", group: "خطط الاشتراك", dir: "ltr" },
  { key: "plan_basic_old_price", label: "الباقة 1 – السعر قبل الخصم (0 = بدون)", type: "number", group: "خطط الاشتراك", dir: "ltr" },
  { key: "plan_basic_cta", label: "الباقة 1 – نص الزر", group: "خطط الاشتراك" },
  { key: "plan_basic_features", label: "الباقة 1 – المميزات (سطر لكل ميزة، ابدأ السطر بـ - للميزة غير المتاحة)", type: "textarea", group: "خطط الاشتراك" },
  { key: "plan_premium_name", label: "الباقة 2 – الاسم (اتركه فارغًا لإخفائها)", group: "خطط الاشتراك" },
  { key: "plan_premium_tagline", label: "الباقة 2 – الوصف القصير", group: "خطط الاشتراك" },
  { key: "plan_premium_price", label: "الباقة 2 – السعر (جنيه)", type: "number", group: "خطط الاشتراك", dir: "ltr" },
  { key: "plan_premium_old_price", label: "الباقة 2 – السعر قبل الخصم (0 = بدون)", type: "number", group: "خطط الاشتراك", dir: "ltr" },
  { key: "plan_premium_cta", label: "الباقة 2 – نص الزر", group: "خطط الاشتراك" },
  { key: "plan_premium_features", label: "الباقة 2 – المميزات (سطر لكل ميزة، - للميزة غير المتاحة)", type: "textarea", group: "خطط الاشتراك" },
  { key: "plan_vip_name", label: "الباقة 3 – الاسم (اتركه فارغًا لإخفائها)", group: "خطط الاشتراك" },
  { key: "plan_vip_tagline", label: "الباقة 3 – الوصف القصير", group: "خطط الاشتراك" },
  { key: "plan_vip_price", label: "الباقة 3 – السعر (جنيه)", type: "number", group: "خطط الاشتراك", dir: "ltr" },
  { key: "plan_vip_old_price", label: "الباقة 3 – السعر قبل الخصم (0 = بدون)", type: "number", group: "خطط الاشتراك", dir: "ltr" },
  { key: "plan_vip_cta", label: "الباقة 3 – نص الزر", group: "خطط الاشتراك" },
  { key: "plan_vip_features", label: "الباقة 3 – المميزات (سطر لكل ميزة، - للميزة غير المتاحة)", type: "textarea", group: "خطط الاشتراك" },
  { key: "max_devices", label: "الحد الأقصى للأجهزة لكل حساب", type: "number", group: "الأمان", dir: "ltr" },
  { key: "allow_registration", label: "السماح بالتسجيل الجديد", type: "select", group: "الأمان" },
  { key: "developer_name", label: "اسم الشركة المطوّرة", group: "الهوية" },
  { key: "developer_url", label: "رابط الشركة المطوّرة", group: "الهوية", dir: "ltr" },
];

export function SettingsForm({ values }: { values: SiteSettings }) {
  const [state, action] = useActionState(updateSettingsAction, null);
  const groups = Array.from(new Set(SETTINGS_FIELDS.map((f) => f.group)));
  return (
    <form action={action} className="space-y-6">
      <FormMessage state={state} />
      {groups.map((g) => (
        <section key={g} className="card p-6">
          <h2 className="mb-4 text-base font-black text-slate-900">{g}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {SETTINGS_FIELDS.filter((f) => f.group === g).map((f) => (
              <Field key={f.key} label={f.label} name={f.key} hint={f.hint} className={f.type === "textarea" ? "sm:col-span-2" : undefined}>
                {f.type === "textarea" ? (
                  <Textarea id={f.key} name={f.key} defaultValue={values[f.key]} className="min-h-24" />
                ) : f.type === "select" ? (
                  <Select id={f.key} name={f.key} defaultValue={values[f.key]}>
                    <option value="true">مفعّل</option>
                    <option value="false">مغلق</option>
                  </Select>
                ) : f.type === "plan_select" ? (
                  <Select id={f.key} name={f.key} defaultValue={values[f.key]}>
                    <option value="basic">الباقة 1</option>
                    <option value="premium">الباقة 2</option>
                    <option value="vip">الباقة 3</option>
                    <option value="none">بدون شارة</option>
                  </Select>
                ) : f.type === "anim_select" ? (
                  <Select id={f.key} name={f.key} defaultValue={values[f.key]}>
                    {ANIMATION_PRESETS.map((p) => (
                      <option key={p} value={p}>{ANIMATION_PRESET_LABELS[p].label} – {ANIMATION_PRESET_LABELS[p].hint}</option>
                    ))}
                  </Select>
                ) : f.type === "color" ? (
                  <span className="flex items-center gap-2">
                    <input type="color" id={f.key} name={f.key} defaultValue={/^#[0-9a-fA-F]{6}$/.test(values[f.key]) ? values[f.key] : "#7c5cff"} className="h-11 w-16 shrink-0 cursor-pointer rounded-xl border border-lav-300 bg-white p-1" dir="ltr" />
                    <Input defaultValue={values[f.key]} dir="ltr" maxLength={7} aria-label={f.label} onChange={(e) => { const c = document.getElementById(f.key) as HTMLInputElement | null; if (c && /^#[0-9a-fA-F]{6}$/.test(e.target.value)) c.value = e.target.value; }} />
                  </span>
                ) : (
                  <Input id={f.key} name={f.key} type={f.type === "number" ? "number" : "text"} defaultValue={values[f.key]} dir={f.dir} />
                )}
              </Field>
            ))}
          </div>
        </section>
      ))}
      <SubmitButton pendingText="جارٍ الحفظ..."><Save className="size-4" /> حفظ كل الإعدادات</SubmitButton>
    </form>
  );
}

/* ───────────── Floating support button (teacher_admin + super_admin) ───────────── */

export function SupportForm({ values }: { values: SupportConfig }) {
  const [state, action] = useActionState(updateSupportSettingsAction, null);
  return (
    <form action={action} className="space-y-6">
      <FormMessage state={state} />
      <section className="card p-6">
        <h2 className="mb-1 text-base font-black text-slate-900">زر الدعم والتواصل العائم</h2>
        <p className="mb-4 text-xs leading-6 text-slate-500">يظهر أسفل صفحات الموقع، ويفتح محادثة برقم السكرتارية مع رسالة الترحيب تلقائيًا.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Checkbox name="enabled" label="إظهار الزر العائم في المنصة" hint="إيقافه يخفي زر التواصل من كل الصفحات" defaultChecked={values.enabled} />
          </div>
          <Field label="تطبيق التواصل" name="channels">
            <Select id="channels" name="channels" defaultValue={values.channels}>
              <option value="both">واتساب وتيليجرام معًا</option>
              <option value="whatsapp">واتساب فقط</option>
              <option value="telegram">تيليجرام فقط</option>
            </Select>
          </Field>
          <Field label="رسالة الترحيب التلقائية" name="welcome_message" hint="تُرسل جاهزة مع أول ضغطة على الزر">
            <Input id="welcome_message" name="welcome_message" maxLength={300} defaultValue={values.welcomeMessage} />
          </Field>
          <Field label="رقم واتساب السكرتارية" name="whatsapp" hint="بالصيغة الدولية بدون + (مثال: 2010xxxxxxxx)">
            <Input id="whatsapp" name="whatsapp" inputMode="numeric" dir="ltr" maxLength={15} placeholder="2010xxxxxxxx" defaultValue={values.whatsapp} />
          </Field>
          <Field label="اسم مستخدم التيليجرام" name="telegram" hint="بدون @ (مثال: support_username)">
            <Input id="telegram" name="telegram" dir="ltr" maxLength={64} placeholder="username" defaultValue={values.telegram} />
          </Field>
        </div>
      </section>
      <SubmitButton pendingText="جارٍ الحفظ..."><Save className="size-4" /> حفظ إعدادات التواصل</SubmitButton>
    </form>
  );
}
