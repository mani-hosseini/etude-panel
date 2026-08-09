"use client";

import { useEffect, useRef } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { AdminConfirmDelete } from "@/components/admin/AdminConfirmDelete";
import {
  SlideEditorForm,
  type SlideFormState,
} from "@/components/admin/course/SlideEditorForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AdminSlide, SlideKind } from "@/lib/api/admin-client";
import { toFa } from "@/lib/format";
import { cn } from "@/lib/utils";

const kindLabel: Record<SlideKind, string> = {
  COVER: "جلد",
  LESSON: "درس",
  VISUAL: "تصویری",
  OUTRO: "پایانی",
};

type SlideListProps = {
  slides: AdminSlide[];
  editingId: string | null;
  creating?: boolean;
  form: SlideFormState;
  setForm: React.Dispatch<React.SetStateAction<SlideFormState>>;
  savePending?: boolean;
  reorderPending?: boolean;
  formError?: string | null;
  onEdit: (slide: AdminSlide) => void;
  onDelete: (id: string) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onSave: () => void;
  onCloseEditor: () => void;
};

export function SlideList({
  slides,
  editingId,
  creating,
  form,
  setForm,
  savePending,
  reorderPending,
  formError,
  onEdit,
  onDelete,
  onMove,
  onSave,
  onCloseEditor,
}: SlideListProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editingId && !creating) return;
    const frame = window.requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editingId, creating]);

  if (slides.length === 0 && !creating) {
    return (
      <Card className="rounded-2xl border-slate-200 p-10 text-center text-sm text-slate-500 shadow-sm">
        هنوز اسلایدی برای این جلسه نیست.
      </Card>
    );
  }

  return (
    <div dir="rtl" className="space-y-3 text-right">
      {creating ? (
        <div ref={editorRef} id="slide-editor-new" className="scroll-mt-24">
          <SlideEditorForm
            form={form}
            setForm={setForm}
            isEdit={false}
            pending={savePending}
            error={formError}
            onSubmit={onSave}
            onClose={onCloseEditor}
          />
        </div>
      ) : null}

      <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
        <div className="divide-y divide-slate-100">
          {slides.map((slide, index) => {
            const isEditing = editingId === slide.id;
            return (
              <div key={slide.id} className="bg-white">
                <div
                  className={cn(
                    "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5",
                    isEditing && "bg-brand/5",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-start gap-2">
                      <span className="text-xs font-semibold text-slate-500">
                        #{toFa(slide.sortOrder)}
                      </span>
                      <Badge variant="outline" className="rounded-lg">
                        {kindLabel[slide.kind]}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        فصل {slide.chapter}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {slide.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {slide.body}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-9 rounded-lg"
                      disabled={index === 0 || reorderPending}
                      onClick={() => onMove(index, -1)}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-9 rounded-lg"
                      disabled={
                        index === slides.length - 1 || reorderPending
                      }
                      onClick={() => onMove(index, 1)}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={isEditing ? "default" : "outline"}
                      className="rounded-xl"
                      onClick={() => onEdit(slide)}
                    >
                      {isEditing ? "در حال ویرایش" : "ویرایش"}
                    </Button>
                    <AdminConfirmDelete
                      title="حذف اسلاید؟"
                      description="این اسلاید برای همیشه حذف می‌شود."
                      onConfirm={() => onDelete(slide.id)}
                    />
                  </div>
                </div>

                {isEditing ? (
                  <div
                    ref={editorRef}
                    id={`slide-editor-${slide.id}`}
                    className="border-t border-brand/15 bg-slate-50/80 px-3 py-4 sm:px-5 scroll-mt-24"
                  >
                    <SlideEditorForm
                      form={form}
                      setForm={setForm}
                      isEdit
                      pending={savePending}
                      error={formError}
                      onSubmit={onSave}
                      onClose={onCloseEditor}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
