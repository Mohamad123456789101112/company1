import { and, asc, count, desc, eq, type SQL } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db } from "@/db";
import { activationCodes, courseUnits, courses, lessons, users } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { deleteCodeAction } from "@/actions/admin";
import { CodesForm, type CodeTree } from "@/components/admin/forms";
import { Collapsible, CopyButton } from "@/components/ui-client";
import { Badge, PageHeader, Select, StatCard } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default async function CodesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const conds: SQL[] = [];
  if (sp.status === "used") conds.push(eq(activationCodes.isUsed, true));
  if (sp.status === "unused") conds.push(eq(activationCodes.isUsed, false));
  if (sp.batch) conds.push(eq(activationCodes.batch, sp.batch.slice(0, 60)));
  const where = conds.length ? and(...conds) : undefined;

  const [list, courseRows, unitRows, lessonRows, [{ total }], [{ used }], batches] = await Promise.all([
    db
      .select({ c: activationCodes, courseTitle: courses.title, unitTitle: courseUnits.title, lessonTitle: lessons.title, usedByName: users.name })
      .from(activationCodes)
      .leftJoin(courses, eq(courses.id, activationCodes.courseId))
      .leftJoin(courseUnits, eq(courseUnits.id, activationCodes.unitId))
      .leftJoin(lessons, eq(lessons.id, activationCodes.lessonId))
      .leftJoin(users, eq(users.id, activationCodes.usedBy))
      .where(where)
      .orderBy(desc(activationCodes.createdAt))
      .limit(300),
    db.select({ id: courses.id, title: courses.title }).from(courses).orderBy(asc(courses.grade), asc(courses.orderIndex)),
    db.select({ id: courseUnits.id, title: courseUnits.title, courseId: courseUnits.courseId }).from(courseUnits).orderBy(asc(courseUnits.orderIndex)),
    db.select({ id: lessons.id, title: lessons.title, unitId: lessons.unitId }).from(lessons).orderBy(asc(lessons.orderIndex)),
    db.select({ total: count() }).from(activationCodes),
    db.select({ used: count() }).from(activationCodes).where(eq(activationCodes.isUsed, true)),
    db.selectDistinct({ batch: activationCodes.batch }).from(activationCodes).orderBy(activationCodes.batch),
  ]);
  const tree: CodeTree = courseRows.map((c) => ({
    id: c.id,
    title: c.title,
    units: unitRows.filter((u) => u.courseId === c.id).map((u) => ({ id: u.id, title: u.title, lessons: lessonRows.filter((l) => l.unitId === u.id).map((l) => ({ id: l.id, title: l.title })) })),
  }));
  const unusedText = list.filter((r) => !r.c.isUsed).map((r) => r.c.code).join("\n");

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="طلاب السنتر" title="أكواد السنتر" subtitle="أكواد تُعطى لطلاب السنتر غير المشتركين في المنصة لفتح كورس كامل أو وحدة أو درس محدد – كل كود يُستخدم مرة واحدة" />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="إجمالي الأكواد" value={Number(total)} />
        <StatCard label="مستخدمة" value={Number(used)} tone="success" />
        <StatCard label="متاحة" value={Number(total) - Number(used)} tone="accent" />
      </div>
      {true ? (
        tree.length ? (
          <Collapsible title="توليد أكواد جديدة" defaultOpen>
            <CodesForm tree={tree} />
          </Collapsible>
        ) : (
          <p className="card p-4 text-sm text-slate-500">أنشئ كورسًا أولًا لتتمكن من توليد الأكواد.</p>
        )
      ) : (
        <p className="card p-4 text-sm text-slate-500">توليد الأكواد متاح لحساب المدير فقط.</p>
      )}

      <form className="card flex flex-wrap items-end gap-3 p-4">
        <div className="w-44"><Select name="status" defaultValue={sp.status ?? ""}><option value="">كل الأكواد</option><option value="unused">المتاحة فقط</option><option value="used">المستخدمة فقط</option></Select></div>
        <div className="w-56"><Select name="batch" defaultValue={sp.batch ?? ""}><option value="">كل الدفعات</option>{batches.filter((b) => b.batch).map((b) => <option key={b.batch} value={b.batch!}>{b.batch}</option>)}</Select></div>
        <button className="btn btn-outline">تصفية</button>
        {unusedText && <CopyButton text={unusedText} label={`نسخ الأكواد المتاحة (${unusedText.split("\n").length})`} className="ms-auto" />}
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>الكود</th><th>النطاق</th><th>المحتوى</th><th>الدفعة</th><th>الحالة</th><th>استخدمه</th><th>الصلاحية</th><th></th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-slate-500">لا توجد أكواد</td></tr>}
            {list.map(({ c, courseTitle, unitTitle, lessonTitle, usedByName }) => (
              <tr key={c.id}>
                <td className="font-mono text-xs font-bold text-slate-900" dir="ltr">{c.code}</td>
                <td>{c.scope === "course" ? <Badge tone="brand">كورس</Badge> : c.scope === "unit" ? <Badge tone="accent">وحدة</Badge> : <Badge tone="violet">درس</Badge>}</td>
                <td className="text-xs"><span className="font-bold text-slate-800">{c.scope === "course" ? courseTitle : c.scope === "unit" ? unitTitle : lessonTitle}</span>{c.scope !== "course" && <span className="block text-[10px] text-slate-500">{courseTitle}</span>}</td>
                <td className="text-xs text-slate-500">{c.batch ?? "—"}</td>
                <td>{c.isUsed ? <Badge tone="success">مستخدم</Badge> : c.expiresAt && c.expiresAt < new Date() ? <Badge tone="danger">منتهي</Badge> : <Badge tone="neutral">متاح</Badge>}</td>
                <td className="text-xs">{usedByName ? <>{usedByName}<span className="block text-[10px] text-slate-500">{formatDate(c.usedAt, true)}</span></> : "—"}</td>
                <td className="text-xs text-slate-500">{c.expiresAt ? formatDate(c.expiresAt) : "بدون"}</td>
                <td>
                  {!c.isUsed && (
                    <form action={deleteCodeAction}><input type="hidden" name="codeId" value={c.id} /><button className="btn btn-ghost btn-sm text-rose-600" title="حذف"><Trash2 className="size-3.5" /></button></form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
