"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { ClipboardCheck, FileText, GripVertical, Pencil, PlayCircle, Plus, Trash2, X } from "lucide-react";
import { deleteLessonAction, deleteUnitAction, reorderLessonsAction, reorderUnitsAction } from "@/actions/admin";
import { LessonForm, UnitForm } from "@/components/admin/forms";
import { ConfirmForm } from "@/components/ui-client";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { CourseUnit, Lesson } from "@/db/schema";

type UnitWithLessons = CourseUnit & { lessons: (Lesson & { quizId: string | null })[] };

const typeIcon = { video: PlayCircle, pdf: FileText, quiz: ClipboardCheck } as const;

type DragPayload =
  | { kind: "unit"; unitId: string }
  | { kind: "lesson"; unitId: string; lessonId: string };

/**
 * Hierarchical curriculum builder: كورس ← فصول (وحدات) ← دروس.
 * Every level can be reordered (and lessons moved across units) with Drag & Drop.
 */
export function CourseBuilder({ courseId, units: initialUnits, bunnyEnabled = false }: { courseId: string; units: UnitWithLessons[]; bunnyEnabled?: boolean }) {
  const router = useRouter();
  const [units, setUnits] = useState<UnitWithLessons[]>(initialUnits);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dragRef = useRef<DragPayload | null>(null);

  // Server actions revalidate the page, so new/edited/deleted lessons arrive as
  // fresh props. Keep the local (drag-optimistic) copy in sync with them.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnits(initialUnits);
  }, [initialUnits]);

  const unitOptions = units.map((u) => ({ id: u.id, title: u.title }));

  const persistUnits = async (next: UnitWithLessons[]) => {
    const fd = new FormData();
    fd.set("courseId", courseId);
    fd.set("unitIds", next.map((u) => u.id).join(","));
    const res = await reorderUnitsAction(fd);
    if (!res.ok) router.refresh();
  };

  const persistLessons = async (next: UnitWithLessons[]) => {
    const order = next.flatMap((u) => u.lessons.map((l, i) => ({ lessonId: l.id, unitId: u.id, orderIndex: i })));
    const fd = new FormData();
    fd.set("courseId", courseId);
    fd.set("order", JSON.stringify(order));
    const res = await reorderLessonsAction(fd);
    if (!res.ok) router.refresh();
  };

  const onDragStart = (e: DragEvent, payload: DragPayload) => {
    dragRef.current = payload;
    setDrag(payload);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", payload.kind === "unit" ? payload.unitId : payload.lessonId);
  };

  const onDragEnd = () => {
    dragRef.current = null;
    setDrag(null);
    setOverKey(null);
    setSaving(false);
  };

  /** Drop a unit before `targetUnitId` (reorder chapters). */
  const dropOnUnit = (targetUnitId: string) => {
    const d = dragRef.current;
    if (!d || d.kind !== "unit") return;
    const from = units.findIndex((u) => u.id === d.unitId);
    const to = units.findIndex((u) => u.id === targetUnitId);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...units];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setUnits(next);
    setSaving(true);
    void persistUnits(next).finally(() => setSaving(false));
    onDragEnd();
  };

  /** Drop a lesson onto a lesson row (insert before it) or into a unit (append). */
  const dropOnLesson = (targetUnitId: string, beforeLessonId?: string) => {
    const d = dragRef.current;
    if (!d || d.kind !== "lesson") return;
    if (d.lessonId === beforeLessonId) return;
    const next = units.map((u) => ({ ...u, lessons: [...u.lessons] }));
    const fromUnit = next.find((u) => u.id === d.unitId);
    const toUnit = next.find((u) => u.id === targetUnitId);
    if (!fromUnit || !toUnit) return;
    const fromIdx = fromUnit.lessons.findIndex((l) => l.id === d.lessonId);
    if (fromIdx < 0) return;
    const [moved] = fromUnit.lessons.splice(fromIdx, 1);
    const toIdx = beforeLessonId ? toUnit.lessons.findIndex((l) => l.id === beforeLessonId) : toUnit.lessons.length;
    toUnit.lessons.splice(toIdx < 0 ? toUnit.lessons.length : toIdx, 0, moved);
    setUnits(next);
    setSaving(true);
    void persistLessons(next).finally(() => setSaving(false));
    onDragEnd();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3 text-xs font-bold text-brand-800">
        <span>💡 اسحب 🟰 بجوار الوحدة أو الدرس لتغيير مكانه بالسحب والإسقاط (يمكن سحب الدرس من وحدة إلى أخرى).</span>
        {saving && <span className="text-slate-500">جارٍ حفظ الترتيب…</span>}
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-black text-slate-900">إضافة وحدة / فصل جديد</h3>
        <UnitForm courseId={courseId} nextOrder={units.length} />
      </div>

      {units.length === 0 && <p className="card p-6 text-center text-sm text-slate-500">ابدأ بإضافة وحدة ثم أضف الدروس داخلها.</p>}

      {units.map((u, ui) => (
        <div
          key={u.id}
          className={cn("card overflow-hidden transition", drag?.kind === "unit" && drag.unitId === u.id && "opacity-50", overKey === `unit-${u.id}` && "ring-2 ring-brand-400")}
          onDragOver={(e) => {
            if (dragRef.current?.kind === "unit") {
              e.preventDefault();
              setOverKey(`unit-${u.id}`);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            dropOnUnit(u.id);
            setOverKey(null);
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-5 py-3">
            <span
              draggable
              onDragStart={(e) => onDragStart(e, { kind: "unit", unitId: u.id })}
              onDragEnd={onDragEnd}
              className="flex cursor-grab items-center gap-3 active:cursor-grabbing"
              title="اسحب لإعادة ترتيب الوحدات"
            >
              <GripVertical className="size-4 shrink-0 text-slate-400" />
              <span className="grid size-8 place-items-center rounded-lg bg-emerald-500/15 text-xs font-black text-emerald-700">{ui + 1}</span>
              <span className="text-sm font-black text-slate-900">{u.title}</span>
              <span className="text-xs text-slate-500">{u.lessons.length} درس</span>
            </span>
            <span className="flex gap-2">
              <button type="button" onClick={() => setAdding(adding === u.id ? null : u.id)} className="btn btn-primary btn-sm">{adding === u.id ? <X className="size-3.5" /> : <Plus className="size-3.5" />} درس جديد</button>
              <ConfirmForm action={deleteUnitAction} message="حذف الوحدة وكل دروسها؟">
                <input type="hidden" name="unitId" value={u.id} />
                <input type="hidden" name="courseId" value={courseId} />
                <button className="btn btn-danger btn-sm"><Trash2 className="size-3.5" /></button>
              </ConfirmForm>
            </span>
          </div>

          {adding === u.id && (
            <div className="border-b border-slate-200 p-4">
              <LessonForm courseId={courseId} units={unitOptions} defaultUnitId={u.id} nextOrder={u.lessons.length} bunnyEnabled={bunnyEnabled} />
            </div>
          )}

          <ul
            onDragOver={(e) => {
              if (dragRef.current?.kind === "lesson") {
                e.preventDefault();
                setOverKey(`list-${u.id}`);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              dropOnLesson(u.id);
              setOverKey(null);
            }}
            className={cn(overKey === `list-${u.id}` && "bg-brand-50/60")}
          >
            {u.lessons.map((l) => {
              const Icon = typeIcon[l.type];
              return (
                <li
                  key={l.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, { kind: "lesson", unitId: u.id, lessonId: l.id })}
                  onDragEnd={onDragEnd}
                  onDragOver={(e) => {
                    if (dragRef.current?.kind === "lesson" && dragRef.current.lessonId !== l.id) {
                      e.preventDefault();
                      e.stopPropagation();
                      setOverKey(`lesson-${l.id}`);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropOnLesson(u.id, l.id);
                    setOverKey(null);
                  }}
                  className={cn(
                    "cursor-grab border-b border-slate-200 last:border-0 active:cursor-grabbing",
                    drag?.kind === "lesson" && drag.lessonId === l.id && "opacity-50",
                    overKey === `lesson-${l.id}` && "border-t-2 border-t-brand-500 bg-brand-50/70",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="flex items-center gap-3">
                      <GripVertical className="size-4 shrink-0 text-slate-400" />
                      <Icon className="size-4 text-brand-400" />
                      <span className="font-bold text-slate-900">{l.title}</span>
                      {l.isFreePreview && <Badge tone="success">مجاني</Badge>}
                      {!l.isPublished && <Badge tone="warning">مخفي</Badge>}
                      {l.durationMinutes > 0 && <span className="text-[11px] text-slate-500">{l.durationMinutes} د</span>}
                    </span>
                    <span className="flex gap-2">
                      {l.type === "quiz" && l.quizId && (
                        <Link href={`/admin/courses/${courseId}/quiz/${l.quizId}`} className="btn btn-accent btn-sm"><ClipboardCheck className="size-3.5" /> الأسئلة</Link>
                      )}
                      <button type="button" onClick={() => setEditing(editing === l.id ? null : l.id)} className="btn btn-outline btn-sm">{editing === l.id ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}</button>
                      <ConfirmForm action={deleteLessonAction} message="حذف هذا الدرس؟">
                        <input type="hidden" name="lessonId" value={l.id} />
                        <input type="hidden" name="courseId" value={courseId} />
                        <button className="btn btn-danger btn-sm"><Trash2 className="size-3.5" /></button>
                      </ConfirmForm>
                    </span>
                  </div>
                  {editing === l.id && (
                    <div className="px-4 pb-4">
                      <LessonForm courseId={courseId} units={unitOptions} lesson={l} bunnyEnabled={bunnyEnabled} />
                    </div>
                  )}
                </li>
              );
            })}
            {u.lessons.length === 0 && (
              <li className="px-5 py-4 text-center text-xs text-slate-400">اسحب درسًا إلى هنا أو أضف درسًا جديدًا</li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}
