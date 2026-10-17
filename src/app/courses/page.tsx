import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/shell";
import { CourseCard } from "@/components/course-card";
import { EmptyState, PageHeader } from "@/components/ui";
import { getPublishedCourses } from "@/lib/data";
import { GRADES, GRADE_KEYS, cn, isGrade } from "@/lib/utils";

export const metadata: Metadata = { title: "الكورسات" };
export const dynamic = "force-dynamic";

export default async function CoursesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const grade = isGrade(sp.grade) ? sp.grade : undefined;
  const list = await getPublishedCourses({ grade });

  return (
    <SiteShell>
      <PageHeader eyebrow="المكتبة التعليمية" title="جميع الكورسات" subtitle="اختر صفك الدراسي وابدأ من أول حصة مجانية" />
      <div className="mb-8 flex flex-wrap gap-2">
        <Link href="/courses" className={cn("btn", !grade ? "btn-primary" : "btn-outline")}>الكل</Link>
        {GRADE_KEYS.map((g) => (
          <Link key={g} href={`/courses?grade=${g}`} className={cn("btn", grade === g ? "btn-primary" : "btn-outline")}>
            {GRADES[g].label}
          </Link>
        ))}
      </div>
      {list.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      ) : (
        <EmptyState title="لا توجد كورسات منشورة بعد" description="سيتم إضافة الكورسات قريبًا. تابع الإعلانات لمعرفة الجديد." />
      )}
    </SiteShell>
  );
}
