import { NextResponse, type NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { quizAttempts, quizzes, users } from "@/db/schema";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { in_progress: "جارٍ", submitted: "تم التسليم", cancelled: "ملغي (غش/خروج)" };

/** CSV export of a quiz's attempts (staff only). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) return new NextResponse("Forbidden", { status: 403 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });

  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id)).limit(1);
  if (!quiz) return new NextResponse("Not found", { status: 404 });

  const rows = await db
    .select({ a: quizAttempts, name: users.name, phone: users.phone, parentPhone: users.parentPhone, email: users.email })
    .from(quizAttempts)
    .innerJoin(users, eq(users.id, quizAttempts.userId))
    .where(eq(quizAttempts.quizId, id))
    .orderBy(desc(quizAttempts.startedAt));

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["الاسم", "الهاتف", "هاتف ولي الأمر", "البريد", "الحالة", "الدرجة", "من", "النسبة", "ناجح", "مخالفات", "سبب الإلغاء", "بدأ", "سلّم"];
  const lines = rows.map((r) =>
    [r.name, r.phone, r.parentPhone, r.email, STATUS[r.a.status] ?? r.a.status, r.a.score, r.a.total, `${r.a.percent}%`, r.a.passed ? "نعم" : "لا", r.a.violations, r.a.cancelReason ?? "", formatDate(r.a.startedAt, true), formatDate(r.a.submittedAt, true)]
      .map(esc)
      .join(","),
  );
  const csv = "\uFEFF" + [header.map(esc).join(","), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="quiz-results-${id.slice(0, 8)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
