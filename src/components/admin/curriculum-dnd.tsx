"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  ClipboardCheck,
  FileText,
  GripVertical,
  Loader2,
  Pencil,
  PlayCircle,
  Plus,
  Save,
  Trash2,
  X,
  ArrowUp,
  ArrowDown,
  RotateCcw,
} from "lucide-react";
import { deleteLessonAction, deleteUnitAction, reorderCurriculumAction } from "@/actions/admin";
import { LessonForm, UnitForm } from "@/components/admin/forms";
import { ConfirmForm } from "@/components/ui-client";
import { Badge, FormMessage } from "@/components/ui";
import type { CourseUnit, Lesson } from "@/db/schema";
import { cn } from "@/lib/utils";

type UnitWithLessons = CourseUnit & { lessons: (Lesson & { quizId: string | null })[] };

const typeIcon = { video: PlayCircle, pdf: FileText, quiz: ClipboardCheck } as const;

type DragItem = { kind: "unit"; id: string } | { kind: "lesson"; id: string; unitId: string };
type DropTarget = { kind: "unit"; id: string; pos: "before" | "after" } | { kind: "lesson"; id: string; unitId: string; pos: "before" | "after" } | { kind: "unit-end"; unitId: string };

/** Moves an item inside a list from index `from` to index `to`. */
function move<T>(list: T[], from: number, to: number): T[] {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function SaveBar({ dirty, onReset }: { dirty: boolean; onReset: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[92%] max-w-xl items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-white/95 p-3 shadow-[0_20px_50px_-20px_rgba(59,39,134,0.55)] backdrop-blur transition-all duration-300 dark:border-brand-300/40 dark:bg-[var(--color-surface-2)]/95",
        dirty || pending ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0",
      )}
      role="status"
      aria-live="polite"
    >
      <p className="text-xs font-bold text-slate-700">رتّبت المنهج يدويًا – احفظ الترتيب الجديد</p>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={onReset} className="btn btn-ghost btn-sm" disabled={pending}>
          <RotateCcw className="size-3.5" /> تراجع
        </button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} حفظ الترتيب
        </button>
      </div>
    </div>
  );
}

/**
 * Teacher-friendly curriculum builder:
 *   course ← units (chapters) ← lessons
 * Drag the ⠿ handle to reorder units and lessons, or move a lesson into
 * another chapter. Keyboard users get ▲/▼ buttons. Changes are saved with
 * one click to `reorderCurriculumAction` (validated server-side).
 */
export function CurriculumDnd({ courseId, units, bunnyEnabled = false }: { courseId: string; units: UnitWithLessons[]; bunnyEnabled?: boolean }) {
  const [items, setItems] = useState<UnitWithLessons[]>(units);
  const [dirty, setDirty] = useState(false);
  const [saveState, saveAction] = useActionState(reorderCurriculumAction, null);
  const [drag, setDrag] = useState<DragItem | null>(null);
  const [over, setOver] = useState<DropTarget | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const dragRef = useRef<DragItem | null>(null);
  const overRef = useRef<DropTarget | null>(null);

  const unitOptions = useMemo(() => items.map((u) => ({ id: u.id, title: u.title })), [items]);

  // A successful save clears the "unsaved changes" bar. The server action
  // returns a fresh object on every submit, so this only fires after a save.
  useEffect(() => {
    if (saveState?.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDirty(false);
    }
  }, [saveState]);

  const reset = () => {
    setItems(units);
    setDirty(false);
    setDrag(null);
    setOver(null);
  };

  const startDrag = (item: DragItem) => {
    dragRef.current = item;
    setDrag(item);
  };
  const endDrag = () => {
    dragRef.current = null;
    overRef.current = null;
    setDrag(null);
    setOver(null);
  };
  const hover = (target: DropTarget) => {
    overRef.current = target;
    setOver(target);
  };

  const drop = () => {
    const from = dragRef.current;
    const to = overRef.current;
    endDrag();
    if (!from || !to) return;

    if (from.kind === "unit") {
      if (to.kind !== "unit" && to.kind !== "unit-end") return;
      if (to.kind === "unit" && to.id === from.id) return;
      setItems((prev) => {
        const fromIdx = prev.findIndex((u) => u.id === from.id);
        if (fromIdx < 0) return prev;
        let toIdx = to.kind === "unit-end" ? prev.length : prev.findIndex((u) => u.id === to.id);
        if (to.kind === "unit" && to.pos === "after") toIdx += 1;
        if (toIdx < 0) return prev;
        // When moving down, removing the source shifts the target by one.
        if (fromIdx < toIdx) toIdx -= 1;
        if (fromIdx === toIdx) return prev;
        setDirty(true);
        return move(prev, fromIdx, toIdx);
      });
      return;
    }

    // lesson
    setItems((prev) => {
      const srcUnitIdx = prev.findIndex((u) => u.id === from.unitId);
      if (srcUnitIdx < 0) return prev;
      const lesson = prev[srcUnitIdx].lessons.find((l) => l.id === from.id);
      if (!lesson) return prev;

      const targetUnitIdx = to.kind === "unit" ? prev.findIndex((u) => u.id === to.id) : to.kind === "lesson" ? prev.findIndex((u) => u.id === to.unitId) : prev.findIndex((u) => u.id === to.unitId);
      if (targetUnitIdx < 0) return prev;
      const targetUnit = prev[targetUnitIdx];

      let insertAt = targetUnit.lessons.length;
      if (to.kind === "lesson") {
        const idx = targetUnit.lessons.findIndex((l) => l.id === to.id);
        if (idx < 0) return prev;
        insertAt = to.pos === "after" ? idx + 1 : idx;
      }
      if (to.kind === "unit") insertAt = to.pos === "after" ? targetUnit.lessons.length : 0;

      const sameUnit = srcUnitIdx === targetUnitIdx;
      if (sameUnit) {
        const fromIdx = prev[srcUnitIdx].lessons.findIndex((l) => l.id === from.id);
        let toIdx = insertAt;
        if (fromIdx < toIdx) toIdx -= 1;
        if (fromIdx === toIdx) return prev;
        const lessons = move(prev[srcUnitIdx].lessons, fromIdx, toIdx);
        setDirty(true);
        return prev.map((u, i) => (i === srcUnitIdx ? { ...u, lessons } : u));
      }

      setDirty(true);
      return prev.map((u, i) => {
        if (i === srcUnitIdx) return { ...u, lessons: u.lessons.filter((l) => l.id !== from.id) };
        if (i === targetUnitIdx) {
          const lessons = [...u.lessons];
          lessons.splice(insertAt, 0, { ...lesson, unitId: u.id });
          return { ...u, lessons };
        }
        return u;
      });
    });
  };

  /* keyboard reorder helpers */
  const moveUnitBy = (id: string, dir: -1 | 1) => {
    setItems((prev) => {
      const i = prev.findIndex((u) => u.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      setDirty(true);
      return move(prev, i, j);
    });
  };
  const moveLessonBy = (unitId: string, lessonId: string, dir: -1 | 1) => {
    setItems((prev) => {
      const ui = prev.findIndex((u) => u.id === unitId);
      if (ui < 0) return prev;
      const li = prev[ui].lessons.findIndex((l) => l.id === lessonId);
      const lj = li + dir;
      if (li < 0 || lj < 0 || lj >= prev[ui].lessons.length) return prev;
      setDirty(true);
      return prev.map((u, i) => (i === ui ? { ...u, lessons: move(u.lessons, li, lj) } : u));
    });
  };

  const unitsJson = items.map((u) => u.id);
  const lessonsJson = Object.fromEntries(items.map((u) => [u.id, u.lessons.map((l) => l.id)]));

  const cls = (active: boolean, pos?: "before" | "after", zone = false) =>
    cn(
      "transition-all duration-150",
      zone && active && "drop-zone",
      !zone && active && pos === "before" && "drop-before",
      !zone && active && pos === "after" && "drop-after",
      drag && "select-none",
    );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-brand-200 bg-brand-50/70 px-4 py-3 text-xs leading-6 text-slate-700 dark:border-brand-300/40 dark:bg-brand-50/30">
        <b className="text-slate-900">اسحب وأفلت بسهولة:</b> أمسك أيقونة <GripVertical className="inline size-3.5 align-middle" /> بجوار الفصل أو الدرس وغيّر مكانه – تقدر كمان تنقل درسًا إلى فصل آخر. بعد ما تخلص اضغط <b>حفظ الترتيب</b>.
      </div>

      {/* The reorder form only holds the snapshot + save bar, so the unit/lesson
          cards (which contain their own <form>s) are never nested inside it. */}
      <form action={saveAction} className="space-y-3">
        <FormMessage state={saveState} />
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="units" value={JSON.stringify(unitsJson)} />
        <input type="hidden" name="lessons" value={JSON.stringify(lessonsJson)} />
        <SaveBar dirty={dirty} onReset={reset} />
      </form>

      <div className="space-y-4">
          {items.map((u, ui) => {
            const isUnitOver = over?.kind === "unit" && over.id === u.id;
            return (
              <div
                key={u.id}
                className={cls(isUnitOver && !drag?.kind?.startsWith("lesson"), isUnitOver ? over?.pos : undefined)}
                onDragOver={(e) => {
                  if (dragRef.current?.kind !== "unit") return;
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const after = e.clientY > rect.top + rect.height / 2;
                  hover({ kind: "unit", id: u.id, pos: after ? "after" : "before" });
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragRef.current?.kind === "unit") drop();
                }}
              >
                <div className="card overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:bg-[var(--color-surface)]">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <button
                        type="button"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          startDrag({ kind: "unit", id: u.id });
                        }}
                        onDragEnd={endDrag}
                        className="grid size-9 cursor-grab place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-brand-600 active:cursor-grabbing"
                        aria-label={`اسحب الفصل ${u.title} لتغيير ترتيبه`}
                        title="اسحب لتغيير الترتيب"
                      >
                        <GripVertical className="size-4" />
                      </button>
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-xs font-black text-brand-700">{ui + 1}</span>
                      <span className="truncate text-sm font-black text-slate-900">{u.title}</span>
                      <span className="hidden shrink-0 text-[11px] text-slate-500 sm:inline">{u.lessons.length} درس</span>
                    </span>
                    <span className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <button type="button" onClick={() => moveUnitBy(u.id, -1)} disabled={ui === 0} className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-brand-600 disabled:opacity-30" aria-label="تحريك الفصل لأعلى"><ArrowUp className="size-4" /></button>
                      <button type="button" onClick={() => moveUnitBy(u.id, 1)} disabled={ui === items.length - 1} className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-brand-600 disabled:opacity-30" aria-label="تحريك الفصل لأسفل"><ArrowDown className="size-4" /></button>
                      <button type="button" onClick={() => setAdding(adding === u.id ? null : u.id)} className="btn btn-primary btn-sm">{adding === u.id ? <X className="size-3.5" /> : <Plus className="size-3.5" />} درس</button>
                      <ConfirmForm action={deleteUnitAction} message="حذف الوحدة وكل دروسها؟">
                        <input type="hidden" name="unitId" value={u.id} />
                        <input type="hidden" name="courseId" value={courseId} />
                        <button className="btn btn-danger btn-sm" aria-label="حذف الفصل"><Trash2 className="size-3.5" /></button>
                      </ConfirmForm>
                    </span>
                  </div>

                  {adding === u.id && (
                    <div className="border-b border-slate-200 p-4">
                      <LessonForm courseId={courseId} units={unitOptions} defaultUnitId={u.id} nextOrder={u.lessons.length} bunnyEnabled={bunnyEnabled} />
                    </div>
                  )}

                  <ul className="min-h-12">
                    {u.lessons.map((l, li) => {
                      const Icon = typeIcon[l.type];
                      const isLessonOver = over?.kind === "lesson" && over.id === l.id;
                      return (
                        <li
                          key={l.id}
                          className={cn("border-b border-slate-200 last:border-0", cls(isLessonOver, isLessonOver ? over?.pos : undefined))}
                          onDragOver={(e) => {
                            if (dragRef.current?.kind !== "lesson") return;
                            e.preventDefault();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const after = e.clientY > rect.top + rect.height / 2;
                            hover({ kind: "lesson", id: l.id, unitId: u.id, pos: after ? "after" : "before" });
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (dragRef.current?.kind === "lesson") drop();
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                            <span className="flex min-w-0 items-center gap-2">
                              <button
                                type="button"
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.effectAllowed = "move";
                                  startDrag({ kind: "lesson", id: l.id, unitId: u.id });
                                }}
                                onDragEnd={endDrag}
                                className="grid size-7 cursor-grab place-items-center rounded-md text-slate-300 hover:text-brand-600 active:cursor-grabbing"
                                aria-label={`اسحب الدرس ${l.title} لتغيير ترتيبه`}
                                title="اسحب لتغيير الترتيب أو نقله لفصل آخر"
                              >
                                <GripVertical className="size-4" />
                              </button>
                              <span className="w-5 text-center text-[10px] font-black text-slate-400">{li + 1}</span>
                              <Icon className="size-4 shrink-0 text-brand-400" />
                              <span className="truncate font-bold text-slate-900">{l.title}</span>
                              {l.isFreePreview && <Badge tone="success">مجاني</Badge>}
                              {!l.isPublished && <Badge tone="warning">مخفي</Badge>}
                              {l.durationMinutes > 0 && <span className="text-[11px] text-slate-500">{l.durationMinutes} د</span>}
                            </span>
                            <span className="flex shrink-0 items-center gap-1.5">
                              <button type="button" onClick={() => moveLessonBy(u.id, l.id, -1)} disabled={li === 0} className="grid size-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-brand-600 disabled:opacity-25" aria-label="تحريك الدرس لأعلى"><ArrowUp className="size-3.5" /></button>
                              <button type="button" onClick={() => moveLessonBy(u.id, l.id, 1)} disabled={li === u.lessons.length - 1} className="grid size-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-brand-600 disabled:opacity-25" aria-label="تحريك الدرس لأسفل"><ArrowDown className="size-3.5" /></button>
                              {l.type === "quiz" && l.quizId && (
                                <Link href={`/admin/courses/${courseId}/quiz/${l.quizId}`} className="btn btn-accent btn-sm"><ClipboardCheck className="size-3.5" /> الأسئلة</Link>
                              )}
                              <button type="button" onClick={() => setEditing(editing === l.id ? null : l.id)} className="btn btn-outline btn-sm" aria-label="تعديل الدرس">{editing === l.id ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}</button>
                              <ConfirmForm action={deleteLessonAction} message="حذف هذا الدرس؟">
                                <input type="hidden" name="lessonId" value={l.id} />
                                <input type="hidden" name="courseId" value={courseId} />
                                <button className="btn btn-danger btn-sm" aria-label="حذف الدرس"><Trash2 className="size-3.5" /></button>
                              </ConfirmForm>
                            </span>
                          </div>
                          {editing === l.id && (
                            <div className="px-3 pb-4">
                              <LessonForm courseId={courseId} units={unitOptions} lesson={l} bunnyEnabled={bunnyEnabled} />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {/* drop a lesson into this chapter (end) */}
                  <div
                    className={cn("px-4 py-2 text-center text-[11px] text-slate-400", over?.kind === "unit-end" && over.unitId === u.id && drag?.kind === "lesson" && "drop-zone text-brand-600")}
                    onDragOver={(e) => {
                      if (dragRef.current?.kind !== "lesson") return;
                      e.preventDefault();
                      hover({ kind: "unit-end", unitId: u.id });
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragRef.current?.kind === "lesson") drop();
                    }}
                  >
                    {u.lessons.length === 0 ? "لا توجد دروس بعد – اسحب درسًا هنا أو أضف درسًا جديدًا" : "أفلت هنا لنقل الدرس إلى نهاية هذا الفصل"}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-black text-slate-900">إضافة وحدة / فصل جديد</h3>
        <UnitForm courseId={courseId} nextOrder={items.length} />
      </div>
    </div>
  );
}
