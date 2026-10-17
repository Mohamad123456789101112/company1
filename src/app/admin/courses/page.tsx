import Link from "next/link";
import { asc, count, desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/db";
import { courses, enrollments, lessons } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { CourseForm } from "@/components/admin/forms";
import { Collapsible } from "@/components/ui-client";
import { Badge, PageHeader } from "@/components/ui";
import { formatPrice, gradeLabel } from "@/lib/utils";

export default async function AdminCourses() {
  await requireStaff();
  const list = await db.select().from(courses).orderBy(asc(courses.grade), asc(courses.orderIndex), desc(courses.createdAt));
  const [lessonCounts, enrollCounts] = await Promise.all([
    db.select({ courseId: lessons.courseId, c: count() }).from(lessons).groupBy(lessons.courseId),
    db.select({ courseId: enrollments.courseId, c: count() }).from(enrollments).groupBy(enrollments.courseId),
  ]);
  const lc = Object.fromEntries(lessonCounts.map((r) => [r.courseId, Number(r.c)]));
  const ec = Object.fromEntries(enrollCounts.map((r) => [r.courseId, Number(r.c)]));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="المحتوى" title="الكورسات" subtitle="أنشئ الكورسات ثم أضف الوحدات والدروس والامتحانات" />
      <Collapsible title={<span className="flex items-center gap-2"><Plus className="size-4 text-emerald-600" /> إنشاء كورس جديد</span>} defaultOpen={list.length === 0}>
        <CourseForm />
      </Collapsible>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>الكورس</th><th>الصف</th><th>السعر</th><th>الدروس</th><th>المشتركون</th><th>الحالة</th><th></th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-slate-500">لا توجد كورسات بعد – أنشئ أول كورس من الأعلى.</td></tr>}
            {list.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/admin/courses/${c.id}`} className="font-bold text-slate-900 hover:text-brand-600">{c.title}</Link><span className="block text-[11px] text-slate-500" dir="ltr">/{c.slug}</span></td>
                <td><Badge tone="brand">{gradeLabel(c.grade)}</Badge></td>
                <td className="font-bold text-sakr-600">{c.isFree ? "مجاني" : formatPrice(c.discountPrice ?? c.price)}</td>
                <td>{lc[c.id] ?? 0}</td>
                <td>{ec[c.id] ?? 0}</td>
                <td className="space-x-1 space-x-reverse">{c.isPublished ? <Badge tone="success">منشور</Badge> : <Badge tone="warning">مسودة</Badge>}{c.isFeatured && <Badge tone="accent">مميز</Badge>}</td>
                <td><Link href={`/admin/courses/${c.id}`} className="btn btn-outline btn-sm">إدارة المحتوى</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
