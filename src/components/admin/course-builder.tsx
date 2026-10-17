"use client";

import Link from "next/link";
import { useState } from "react";
import { ClipboardCheck, FileText, Pencil, PlayCircle, Plus, Trash2, X } from "lucide-react";
import { deleteLessonAction, deleteUnitAction } from "@/actions/admin";
import { LessonForm, UnitForm } from "@/components/admin/forms";
import { ConfirmForm } from "@/components/ui-client";
import { Badge } from "@/components/ui";
import type { CourseUnit, Lesson } from "@/db/schema";

type UnitWithLessons = CourseUnit & { lessons: (Lesson & { quizId: string | null })[] };

const typeIcon = { video: PlayCircle, pdf: FileText, quiz: ClipboardCheck } as const;

export function CourseBuilder({ courseId, units, bunnyEnabled = false }: { courseId: string; units: UnitWithLessons[]; bunnyEnabled?: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const unitOptions = units.map((u) => ({ id: u.id, title: u.title }));

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h3 className="mb-3 text-sm font-black text-slate-900">إضافة وحدة / فصل جديد</h3>
        <UnitForm courseId={courseId} nextOrder={units.length} />
      </div>

      {units.length === 0 && <p className="card p-6 text-center text-sm text-slate-500">ابدأ بإضافة وحدة ثم أضف الدروس داخلها.</p>}

      {units.map((u, ui) => (
        <div key={u.id} className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-5 py-3">
            <span className="flex items-center gap-3">
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

          <ul>
            {u.lessons.map((l) => {
              const Icon = typeIcon[l.type];
              return (
                <li key={l.id} className="border-b border-slate-200 last:border-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="flex items-center gap-3">
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
          </ul>
        </div>
      ))}
    </div>
  );
}
