import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getUserCourses } from "@/lib/data";
import { CourseCard } from "@/components/course-card";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "كورساتي" };

export default async function MyCoursesPage() {
  const user = await requireUser("/dashboard/courses");
  const list = await getUserCourses(user.id);
  return (
    <div>
      <PageHeader eyebrow="كورساتي" title="الكورسات المشترك بها" subtitle="تابع من حيث توقفت" actions={<Link href="/courses" className="btn btn-outline">إضافة كورس جديد</Link>} />
      {list.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      ) : (
        <EmptyState title="لا توجد كورسات بعد" description="اشترك في كورس صفك الدراسي لتبدأ المذاكرة." action={<Link href="/courses" className="btn btn-primary">تصفح الكورسات</Link>} />
      )}
    </div>
  );
}
