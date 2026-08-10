"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { adminApi } from "@/lib/api/admin-client";
import { ApiError, resolveMediaUrl } from "@/lib/api/http";
import { cn } from "@/lib/utils";

type SlideImageUploadProps = {
  imageId: string;
  imageHint: string;
  disabled?: boolean;
  onImageIdChange: (value: string) => void;
  onImageHintChange: (value: string) => void;
};

export function SlideImageUpload({
  imageId,
  imageHint,
  disabled = false,
  onImageIdChange,
  onImageHintChange,
}: SlideImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = resolveMediaUrl(imageId);

  const onPick = async (file: File | undefined) => {
    if (!file || disabled) return;
    setError(null);
    setUploading(true);
    try {
      const result = await adminApi.uploadSlideImage(file);
      onImageIdChange(result.path);
      if (!imageHint.trim()) {
        onImageHintChange(file.name.replace(/\.[^.]+$/, ""));
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "آپلود تصویر ناموفق بود.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-3", disabled && "select-none")}>
      <div className="space-y-1.5">
        <Label>تصویر اسلاید</Label>
        <p className="text-xs text-slate-500">
          JPG / PNG / WEBP — حداکثر ۵ مگابایت.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 sm:flex-row sm:items-center">
        <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={imageHint || "پیش‌نمایش"}
              className="size-full object-contain"
            />
          ) : (
            <ImagePlus className="size-8 text-slate-300" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => void onPick(e.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImagePlus className="size-4" />
              )}
              {previewUrl ? "تعویض تصویر" : "انتخاب و آپلود"}
            </Button>
            {imageId ? (
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl text-rose-600 hover:bg-rose-50"
                disabled={disabled}
                onClick={() => onImageIdChange("")}
              >
                <Trash2 className="size-4" />
                حذف تصویر
              </Button>
            ) : null}
          </div>
          {error ? (
            <p className="text-xs text-rose-600">{error}</p>
          ) : previewUrl ? (
            <p className="truncate text-[11px] text-slate-400" dir="ltr">
              {imageId}
            </p>
          ) : (
            <p className="text-xs text-slate-400">هنوز تصویری انتخاب نشده.</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slide-image-hint">توضیح تصویر (اختیاری)</Label>
        <input
          id="slide-image-hint"
          disabled={disabled}
          className="flex h-10 w-full rounded-xl border border-input bg-white px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          value={imageHint}
          onChange={(e) => onImageHintChange(e.target.value)}
          placeholder="مثلاً: حامل پنج‌خطی خالی"
        />
      </div>
    </div>
  );
}
