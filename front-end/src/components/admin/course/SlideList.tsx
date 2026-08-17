"use client";

import { useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";

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
  onReorder: (slideIds: string[]) => void;
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
  onReorder,
  onSave,
  onCloseEditor,
}: SlideListProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

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

  const finishDrag = (toIndex: number | null) => {
    if (
      dragIndex === null ||
      toIndex === null ||
      dragIndex === toIndex ||
      reorderPending
    ) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const ids = slides.map((slide) => slide.id);
    const [moved] = ids.splice(dragIndex, 1);
    if (!moved) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    ids.splice(toIndex, 0, moved);
    setDragIndex(null);
    setOverIndex(null);
    onReorder(ids);
  };

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

      {slides.length > 1 ? (
        <p className="text-xs text-slate-500">
          برای جابه‌جایی، دستگیرهٔ سمت چپ هر اسلاید را بکشید و رها کنید.
        </p>
      ) : null}

      <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
        <div className="divide-y divide-slate-100">
          {slides.map((slide, index) => {
            const isEditing = editingId === slide.id;
            const isDragging = dragIndex === index;
            const isOver = overIndex === index && dragIndex !== index;
            return (
              <div
                key={slide.id}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (overIndex !== index) setOverIndex(index);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  finishDrag(index);
                }}
                className={cn(
                  "bg-white transition-colors",
                  isDragging && "opacity-50",
                  isOver && "bg-brand/8 ring-1 ring-inset ring-brand/30",
                )}
              >
                <div
                  className={cn(
                    "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5",
                    isEditing && "bg-brand/5",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-start gap-2">
                      <span className="text-xs font-semibold text-slate-500">
                        #{toFa(index + 1)}
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
                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    <div
                      role="button"
                      tabIndex={0}
                      draggable={!reorderPending}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", slide.id);
                        setDragIndex(index);
                      }}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setOverIndex(null);
                      }}
                      aria-label="جابه‌جایی اسلاید"
                      className={cn(
                        "inline-flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                        reorderPending
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-grab active:cursor-grabbing",
                      )}
                    >
                      <GripVertical className="size-4" />
                    </div>
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
