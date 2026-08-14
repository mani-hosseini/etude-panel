"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ImagePlus, Loader2 } from "lucide-react";

import { AdminConfirmDelete } from "@/components/admin/AdminConfirmDelete";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi, type AdminAttachment } from "@/lib/api/admin-client";
import {
  adminQueryKeys,
  useAdminAttachmentsQuery,
} from "@/lib/api/admin-queries";
import { audienceError } from "@/lib/api/errors";
import { resolveMediaUrl } from "@/lib/api/http";
import { toFa } from "@/lib/format";
import { cn } from "@/lib/utils";

type SessionAttachmentsPanelProps = {
  sessionId: string;
  courseSlug: string;
};

export function SessionAttachmentsPanel({
  sessionId,
  courseSlug,
}: SessionAttachmentsPanelProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const query = useAdminAttachmentsQuery(sessionId);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.attachments(sessionId),
      }),
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.course(courseSlug),
      }),
    ]);
  };

  const upload = useMutation({
    mutationFn: (file: File) =>
      adminApi.uploadAttachment(sessionId, file, caption),
    onSuccess: async () => {
      setCaption("");
      setError(null);
      if (inputRef.current) inputRef.current.value = "";
      await invalidate();
    },
    onError: (err) => {
      setError(audienceError(err, "آپلود فایل انجام نشد."));
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteAttachment(id),
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: (attachmentIds: string[]) =>
      adminApi.reorderAttachments(sessionId, attachmentIds),
    onSuccess: invalidate,
  });

  if (query.isPending) {
    return <Skeleton className="h-64 rounded-2xl" />;
  }

  if (query.isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {audienceError(query.error, "فایل‌های پیوست الان در دسترس نیستند.")}
      </div>
    );
  }

  const attachments = query.data.attachments;

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= attachments.length) return;
    const ids = attachments.map((item) => item.id);
    const current = ids[index];
    ids[index] = ids[next]!;
    ids[next] = current!;
    reorder.mutate(ids);
  };

  const onPick = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    upload.mutate(file);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4">
        <Label>آپلود عکس کلاس</Label>
        <p className="mt-1 text-xs text-slate-500">
          JPG / PNG / WEBP / GIF — حداکثر ۸ مگابایت. این عکس‌ها در صفحه جلسه
          هنرجو نمایش داده می‌شوند.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="attachment-caption">توضیح (اختیاری)</Label>
            <Input
              id="attachment-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="مثلاً: تمرین ریتم روی تخته"
              className="rounded-xl text-right"
            />
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
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
              <ImagePlus className="size-4" />
            )}
            انتخاب و آپلود
          </Button>
        </div>
        {error ? (
          <p className="mt-2 text-xs text-rose-600">{error}</p>
        ) : null}
      </div>

      {attachments.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          هنوز عکسی برای این جلسه پیوست نشده است.
        </p>
      ) : (
        <div className="grid gap-3">
          {attachments.map((item, index) => (
            <AttachmentRow
              key={item.id}
              item={item}
              index={index}
              total={attachments.length}
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

function AttachmentRow({
  item,
  index,
  total,
  pending,
  onMove,
  onDelete,
}: {
  item: AdminAttachment;
  index: number;
  total: number;
  pending: boolean;
  onMove: (index: number, dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const preview = resolveMediaUrl(item.path);

  return (
    <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
      <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={item.caption || item.filename}
            className="size-full object-cover"
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
          فایل {toFa(index + 1)} از {toFa(total)}
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
          title="حذف فایل پیوست؟"
          description="این عکس از جلسه حذف می‌شود."
          onConfirm={onDelete}
          disabled={pending}
        />
      </div>
    </Card>
  );
}
