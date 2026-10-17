import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCourseBySlug, getCurriculum, getCompletedLessonIds } from "@/lib/data";
import { canOpenLesson, getAccessState, getGatedLessonIds } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function LearnIndex({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/learn/${slug}`);
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const state = await getAccessState(user, course.id);
  const units = await getCurriculum(course.id);
  const all = units.flatMap((u) => u.lessons);
  if (!all.length) redirect(`/courses/${slug}`);

  const gated = user.role === "student" ? await getGatedLessonIds(user.id, course.id) : new Set<string>();
  const openable = all.filter((l) => canOpenLesson(state, l) && !gated.has(l.id));
  if (!openable.length) redirect(`/courses/${slug}?locked=1`);

  const done = await getCompletedLessonIds(user.id, course.id);
  const next = openable.find((l) => !done.has(l.id)) ?? openable[0];
  redirect(`/learn/${slug}/${next.id}`);
}
