import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ArrowRight, CalendarClock, Eye, Trash2 } from "lucide-react";
import { db } from "@/db";
import { courseUnits, lessons, quizzes } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { getCourseById, getCourseExams } from "@/lib/data";
import { bunnyConfigured, getSettings } from "@/lib/settings";
import { deleteCourseAction } from "@/actions/admin";
import { CourseForm, StandaloneQuizForm } from "@/components/admin/forms";
import { CurriculumDnd } from "@/components/admin/curriculum-dnd";
import { Collapsible, ConfirmForm } from "@/components/ui-client";
import { Badge, PageHeader } from "@/components/ui";
import { formatDate, gradeLabel } from "@/lib/utils";

export default async function AdminCourseDetail({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const course = await getCourseById(id);
  if (!course) notFound();

  const exams = await getCourseExams(id, true, true);
  const bunnyOn = bunnyConfigured(await getSettings());
  const [units, ls] = await Promise.all([
    db.select().from(courseUnits).where(eq(courseUnits.courseId, id)).orderBy(asc(courseUnits.orderIndex), asc(courseUnits.createdAt)),
    db.select({ lesson: lessons, quizId: quizzes.id }).from(lessons).leftJoin(quizzes, eq(quizzes.lessonId, lessons.id)).where(eq(lessons.courseId, id)).orderBy(asc(lessons.orderIndex), asc(lessons.createdAt)),
  ]);
  const tree = units.map((u) => ({ ...u, lessons: ls.filter((l) => l.lesson.unitId === u.id).map((l) => ({ ...l.lesson, quizId: l.quizId })) }));

  return (
    <div className="space-y-6">
      <Link href="/admin/courses" className="btn btn-ghost btn-sm"><ArrowRight className="size-4" /> كل الكورسات</Link>
      <PageHeader
        eyebrow={gradeLabel(course.grade)}
        title={course.title}
        subtitle={`${ls.length} درس في ${units.length} وحدة`}
        actions={
          <>
            <Link href={`/courses/${course.slug}`} className="btn btn-outline"><Eye className="size-4" /> معاينة</Link>
            {staff.role === "admin" && (
              <ConfirmForm action={deleteCourseAction} message="حذف الكورس نهائيًا مع كل دروسه واشتراكاته؟">
                <input type="hidden" name="courseId" value={course.id} />
                <button className="btn btn-danger"><Trash2 className="size-4" /> حذف الكورس</button>
              </ConfirmForm>
            )}
          </>
        }
      />
      <div className="flex gap-2">{course.isPublished ? <Badge tone="success">منشور</Badge> : <Badge tone="warning">مسودة – غير ظاهر للطلاب</Badge>}{course.isFree && <Badge tone="brand">مجاني</Badge>}</div>

      <Collapsible title="بيانات الكورس (السعر، الوصف، النشر)">
        <CourseForm course={course} />
      </Collapsible>

      <h2 className="flex flex-wrap items-center gap-2 text-lg font-black text-slate-900">
        المنهج: الكورس ← الفصول ← الدروس
        <span className="text-xs font-bold text-slate-500">(اسحب وأفلت للترتيب)</span>
      </h2>
      <CurriculumDnd
        key={tree.map((u) => `${u.id}:${u.lessons.map((l) => l.id).join(".")}`).join("|")}
        courseId={course.id}
        units={tree}
        bunnyEnabled={bunnyOn}
      />

      <h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><CalendarClock className="size-5 text-peach-500" /> امتحانات الكورس</h2>
      <p className="-mt-4 text-xs text-slate-500">كل امتحانات هذا الكورس: شامل على الكورس، على وحدة/فصل، أو على درس محدد – بمواعيد ومنع غش، ويصل إشعار للطلاب المشتركين عند النشر.</p>
      <div className="space-y-3">
        {exams.length === 0 && <p className="card p-5 text-center text-sm text-slate-500">لا توجد امتحانات مستقلة بعد.</p>}
        {exams.map((q) => (
          <div key={q.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="flex flex-wrap items-center gap-1.5 font-bold text-slate-900">{q.title} {q.scope === "course" ? <Badge tone="brand">شامل</Badge> : q.scope === "unit" ? <Badge tone="accent">وحدة: {units.find((u) => u.id === q.unitId)?.title ?? "—"}</Badge> : <Badge tone="violet">درس: {ls.find((l) => l.lesson.id === q.lessonId)?.lesson.title ?? "—"}</Badge>} {!q.isPublished && <Badge tone="warning">مسودة</Badge>}</p>
              <p className="text-xs text-slate-500">{q.availableFrom ? `من ${formatDate(q.availableFrom, true)}` : "متاح دائمًا"}{q.availableUntil ? ` إلى ${formatDate(q.availableUntil, true)}` : ""} • {q.durationMinutes} دقيقة • {q.maxAttempts} محاولة{q.requireLessonComplete ? " • يتطلب إنهاء المحتوى" : ""}{q.unlockLessonId ? " • يفتح درسًا بعد النجاح" : ""}</p>
            </div>
            <Link href={`/admin/courses/${course.id}/quiz/${q.id}`} className="btn btn-outline btn-sm">الأسئلة والنتائج</Link>
          </div>
        ))}
      </div>
      <Collapsible title="إنشاء امتحان جديد (شامل / على وحدة / على درس)" defaultOpen={exams.length === 0 && ls.length > 0}>
        <StandaloneQuizForm courseId={course.id} tree={units.map((u) => ({ id: u.id, title: u.title, lessons: ls.filter((l) => l.lesson.unitId === u.id).map((l) => ({ id: l.lesson.id, title: l.lesson.title, type: l.lesson.type })) }))} />
      </Collapsible>
    </div>
  );
}
