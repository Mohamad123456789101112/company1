import Link from "next/link";
import { FolderPlus, RefreshCw } from "lucide-react";
import type { Course } from "@/db/schema";
import { GRADES, cn, formatDate, formatNumber } from "@/lib/utils";

export type CourseCardData = Course & { lessonsCount?: number; durationMinutes?: number; enrolled?: boolean; progress?: number; partial?: boolean };

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n).trim()}…` : s;
}

/**
 * Course card: white container with a soft shadow, cover, title, price ("X جنيه" / "كورس مجاني"),
 * "بدلاً من" strike-through, short description, created/updated dates, and the two action buttons.
 */
export function CourseCard({ course }: { course: CourseCardData }) {
  const g = GRADES[course.grade];
  const price = course.isFree ? 0 : (course.discountPrice ?? course.price);
  const hasDiscount = !course.isFree && course.discountPrice !== null && course.discountPrice < course.price;
  const enrolled = Boolean(course.enrolled);
  const href = enrolled ? `/learn/${course.slug}` : `/courses/${course.slug}`;

  const Dates = ({ className }: { className?: string }) => (
    <div className={cn("flex flex-col items-start gap-1 font-taj text-xs text-slate-500 md:items-end", className)}>
      <div className="flex flex-row-reverse items-center gap-1 md:flex-row">
        <span>{formatDate(course.createdAt)}</span>
        <FolderPlus className="size-3.5 -translate-y-px" />
      </div>
      <div className="flex flex-row-reverse items-center gap-1 md:flex-row">
        <span>{formatDate(course.updatedAt)}</span>
        <RefreshCw className="size-3.5 -translate-y-px" />
      </div>
    </div>
  );

  return (
    <div className="group relative h-full font-amin">
      <div className={cn("flex h-full flex-col space-y-4 rounded-2xl border-2 bg-white p-4 shadow-[0_1px_2px_rgba(59,39,134,0.05),0_12px_30px_-14px_rgba(59,39,134,0.16)] smooth hover:-translate-y-1 hover:shadow-glow", enrolled ? "border-brand-500" : "border-lav-200 hover:border-brand-300")}>
        <Link href={href} className="relative block overflow-hidden rounded-xl">
          {course.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.coverImage} alt={course.title} className="aspect-video h-full max-h-[300px] w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
          ) : (
            <div className={`aspect-video w-full bg-gradient-to-br ${g.color}`} />
          )}
          <span className="absolute right-3 top-3 rounded-md bg-white/95 px-2 py-0.5 text-[11px] font-bold text-brand-700 shadow-sm">{g.label}</span>
          {enrolled && <span className="absolute left-3 top-3 rounded-md bg-brand-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">{course.partial ? "وصول جزئي (سنتر)" : "مشترك"}</span>}
        </Link>

        <div className="flex flex-col">
          <Link href={href} className="text-lg font-bold leading-7 text-slate-900 hover:text-brand-600">{course.title}</Link>
          <div className="flex w-full flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex flex-row-reverse justify-between md:flex-col md:space-y-1">
              {!enrolled && (
                <div className="text-center md:text-right">
                  <div className="text-brand-600">
                    {price !== 0 ? (
                      <span className="text-xl font-bold">{formatNumber(price)} جنيه</span>
                    ) : (
                      <div className="w-fit rounded-md border border-brand-300 bg-brand-50 px-3 py-1 text-sm font-bold">كورس مجاني</div>
                    )}
                  </div>
                  {hasDiscount && (
                    <div className="flex flex-col gap-1 md:flex-row">
                      <span className="text-sm text-slate-500">بدلاً من</span>
                      <span className="text-sm font-semibold text-rose-500 line-through">{formatNumber(course.price)} جنيهاً</span>
                    </div>
                  )}
                </div>
              )}
              <div className="mt-1 font-taj text-sm text-slate-500">{truncate(course.description, 40)}</div>
            </div>
            <Dates className="hidden md:flex" />
          </div>
        </div>

        {enrolled && (
          <div>
            <div className="mb-1 flex justify-between font-taj text-[11px] font-bold text-slate-500">
              <span>تقدمك في الكورس</span>
              <span className="text-brand-600">{course.progress ?? 0}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-lav-200">
              <div className="h-full rounded-full bg-gradient-to-l from-brand-400 to-peach-400" style={{ width: `${course.progress ?? 0}%` }} />
            </div>
          </div>
        )}

        <div className="!mt-auto flex w-full items-center justify-between pt-4">
          <Dates className="flex w-1/2 md:hidden" />
          <div className="flex w-1/2 flex-col space-y-1 md:w-full">
            <Link href={href} className={cn("btn w-full rounded-xl", enrolled ? "btn-primary" : "btn-outline")}>الدخول للكورس</Link>
            {!enrolled && price !== 0 && (
              <Link href={`/courses/${course.slug}`} className="btn btn-primary w-full rounded-xl">الإشتراك في الكورس !</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
