"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, FileUp, FileText, ImagePlus, Loader2 } from "lucide-react";

import { AdminConfirmDelete } from "@/components/admin/AdminConfirmDelete";
import { RemoteImg } from "@/components/media/remote-img";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi, type AdminExercise } from "@/lib/api/admin-client";
import {
  adminQueryKeys,
  useAdminExercisesQuery,
} from "@/lib/api/admin-queries";
import { audienceError } from "@/lib/api/errors";
import { resolveMediaUrl } from "@/lib/api/http";
import { formatBytes, toFa } from "@/lib/format";
import { EXERCISE_MAX_BYTES, isPdfFile } from "@/lib/media";
import { cn } from "@/lib/utils";

type SessionExercisesPanelProps = {
  sessionId: string;
  courseSlug: string;
};

export function SessionExercisesPanel({
  sessionId,
  courseSlug,
}: SessionExercisesPanelProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const query = useAdminExercisesQuery(sessionId);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.exercises(sessionId),
      }),
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.course(courseSlug),
      }),
    ]);
  };

  const upload = useMutation({
    mutationFn: (file: File) =>
      adminApi.uploadExercise(sessionId, file, caption),
    onSuccess: async () => {
      setCaption("");
      setError(null);
      if (inputRef.current) inputRef.current.value = "";
      await invalidate();
    },
    onError: (err) => {
      setError(audienceError(err, "آپلود تمرین انجام نشد."));
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteExercise(id),
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: (exerciseIds: string[]) =>
      adminApi.reorderExercises(sessionId, exerciseIds),
    onSuccess: invalidate,
  });

  if (query.isPending) {
    return <Skeleton className="h-64 rounded-2xl" />;
  }

  if (query.isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {audienceError(query.error, "تمارین الان در دسترس نیستند.")}
      </div>
    );
  }

  const exercises = query.data.exercises;

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= exercises.length) return;
    const ids = exercises.map((item) => item.id);
    const current = ids[index];
    ids[index] = ids[next]!;
    ids[next] = current!;
    reorder.mutate(ids);
  };

  const onPick = (file: File | undefined) => {
    if (!file) return;
    if (file.size <= 0 || file.size > EXERCISE_MAX_BYTES) {
      setError("حجم فایل حداکثر ۱۰ مگابایت باشد.");
      return;
    }
    setError(null);
    upload.mutate(file);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4">
        <Label>آپلود تمرین</Label>
        <p className="mt-1 text-xs text-slate-500">
          عکس (JPG / PNG / WEBP / GIF) یا PDF — حداکثر ۱۰ مگابایت. این فایل‌ها
          در صفحه جلسه هنرجو نمایش داده می‌شوند.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="exercise-caption">توضیح (اختیاری)</Label>
            <Input
              id="exercise-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="مثلاً: تمرین فاصله‌ها — صفحه ۲"
              className="rounded-xl text-right"
            />
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf"
            className="hidden"
            disabled={upload.isPending}
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <Button
            type="button"
            className="rounded-xl"
            disabled={upload.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileUp className="size-4" />
            )}
            انتخاب و آپلود
          </Button>
        </div>
        {error ? (
          <p className="mt-2 text-xs text-rose-600">{error}</p>
        ) : null}
      </div>

      {exercises.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          هنوز تمرینی برای این جلسه آپلود نشده است.
        </p>
      ) : (
        <div className="grid gap-3">
          {exercises.map((item, index) => (
            <ExerciseRow
              key={item.id}
              item={item}
              index={index}
              total={exercises.length}
              pending={reorder.isPending || remove.isPending}
              onMove={move}
              onDelete={() => remove.mutate(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExerciseRow({
  item,
  index,
  total,
  pending,
  onMove,
  onDelete,
}: {
  item: AdminExercise;
  index: number;
  total: number;
  pending: boolean;
  onMove: (index: number, dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const preview = resolveMediaUrl(item.path);
  const pdf = isPdfFile(item.mimeType, item.filename);

  return (
    <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
      <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {pdf ? (
          <div className="flex flex-col items-center gap-1 text-slate-500">
            <FileText className="size-7" />
            <span className="text-[10px] font-semibold">PDF</span>
          </div>
        ) : preview ? (
          <RemoteImg
            src={preview}
            alt={item.caption || item.filename}
            className="size-full object-cover"
            fallback={
              <div className="flex size-full flex-col items-center justify-center gap-1 px-2 text-center">
                <ImagePlus className="size-5 text-slate-300" />
                <span className="text-[10px] leading-4 text-slate-400">
                  فایل نیست؛ دوباره آپلود کنید
                </span>
              </div>
            }
          />
        ) : (
          <ImagePlus className="size-6 text-slate-300" />
        )}
      </div>
      <div className="min-w-0 flex-1 text-right">
        <p className="truncate text-sm font-semibold text-slate-800">
          {item.caption || item.filename}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {pdf ? "PDF" : "عکس"} · {formatBytes(item.size)} · تمرین{" "}
          {toFa(index + 1)} از {toFa(total)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn("size-9 rounded-xl")}
          disabled={pending || index === 0}
          onClick={() => onMove(index, -1)}
          aria-label="بالا"
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-9 rounded-xl"
          disabled={pending || index === total - 1}
          onClick={() => onMove(index, 1)}
          aria-label="پایین"
        >
          <ArrowDown className="size-4" />
        </Button>
        <AdminConfirmDelete
          title="حذف تمرین؟"
          description="این فایل از تمارین جلسه حذف می‌شود."
          onConfirm={onDelete}
          disabled={pending}
        />
      </div>
    </Card>
  );
}
