import Link from "next/link";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { Search } from "lucide-react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { Badge, Input, PageHeader, Select } from "@/components/ui";
import { GRADES, GRADE_KEYS, formatDate, formatMoney, gradeLabel, isGrade } from "@/lib/utils";

const PAGE_SIZE = 25;

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const grade = isGrade(sp.grade) ? sp.grade : undefined;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const conds: SQL[] = [];
  if (q) conds.push(or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`), ilike(users.phone, `%${q}%`), ilike(users.parentPhone, `%${q}%`))!);
  if (grade) conds.push(eq(users.grade, grade));
  if (sp.status === "banned") conds.push(eq(users.isBanned, true));
  if (sp.status === "staff") conds.push(or(eq(users.role, "admin"), eq(users.role, "assistant"))!);
  const where = conds.length ? and(...conds) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(users).where(where).orderBy(desc(users.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(users).where(where),
  ]);
  const pages = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));
  const qs = (p: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), ...(grade ? { grade } : {}), ...(sp.status ? { status: sp.status } : {}), page: String(p) }).toString()}`;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="إدارة الطلاب" title="الطلاب" subtitle={`${Number(total)} حساب`} />
      <form className="card grid gap-3 p-4 sm:grid-cols-[1fr_200px_160px_auto]">
        <Input name="q" defaultValue={q} placeholder="بحث بالاسم / البريد / الهاتف / هاتف ولي الأمر" />
        <Select name="grade" defaultValue={grade ?? ""}>
          <option value="">كل الصفوف</option>
          {GRADE_KEYS.map((g) => <option key={g} value={g}>{GRADES[g].label}</option>)}
        </Select>
        <Select name="status" defaultValue={sp.status ?? ""}>
          <option value="">كل الحالات</option>
          <option value="banned">محظور</option>
          <option value="staff">فريق الإدارة</option>
        </Select>
        <button className="btn btn-primary"><Search className="size-4" /> بحث</button>
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>الطالب</th><th>الهاتف</th><th>ولي الأمر</th><th>الصف</th><th>الرصيد</th><th>الحالة</th><th>تاريخ التسجيل</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-slate-500">لا توجد نتائج</td></tr>}
            {rows.map((u) => (
              <tr key={u.id}>
                <td>
                  <Link href={`/admin/students/${u.id}`} className="font-bold text-slate-900 hover:text-brand-600">{u.name}</Link>
                  <span className="block text-[11px] text-slate-500" dir="ltr">{u.email}</span>
                </td>
                <td dir="ltr" className="text-right font-mono text-xs">{u.phone ?? "—"}</td>
                <td dir="ltr" className="text-right font-mono text-xs">{u.parentPhone ?? "—"}</td>
                <td><Badge tone="brand">{gradeLabel(u.grade)}</Badge></td>
                <td className="font-bold text-sakr-600">{formatMoney(u.walletBalance)}</td>
                <td className="space-x-1 space-x-reverse">
                  {u.role !== "student" && <Badge tone="success">{u.role === "admin" ? "مدير" : "مساعد"}</Badge>}
                  {u.isBanned ? <Badge tone="danger">محظور</Badge> : !u.isActive ? <Badge tone="warning">موقوف</Badge> : <Badge tone="neutral">نشط</Badge>}
                  {u.lockedUntil && u.lockedUntil > new Date() && <Badge tone="warning">مقفول مؤقتًا</Badge>}
                </td>
                <td className="text-xs text-slate-500">{formatDate(u.createdAt)}</td>
                <td><Link href={`/admin/students/${u.id}`} className="btn btn-outline btn-sm">إدارة</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {page > 1 && <Link href={qs(page - 1)} className="btn btn-outline btn-sm">السابق</Link>}
          <span className="text-slate-500">صفحة {page} من {pages}</span>
          {page < pages && <Link href={qs(page + 1)} className="btn btn-outline btn-sm">التالي</Link>}
        </div>
      )}
    </div>
  );
}
