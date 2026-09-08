"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

import { RemoteImg } from "@/components/media/remote-img";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { audienceError } from "@/lib/api/errors";
import { resolveMediaUrl } from "@/lib/api/http";
import { cn } from "@/lib/utils";

const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type ExamImageFieldProps = {
  label: string;
  hint: string;
  imagePath: string | null;
  disabled?: boolean;
  uploading?: boolean;
  onFile: (file: File) => void;
  pendingPreviewUrl?: string | null;
};

export function validateExamImage(file: File): string | null {
  if (!IMAGE_TYPES.has(file.type)) {
    return "فقط تصویرهای JPG، PNG، WEBP یا GIF مجاز هستند.";
  }
  if (file.size <= 0 || file.size > IMAGE_MAX_BYTES) {
    return "حجم تصویر حداکثر ۸ مگابایت باشد.";
  }
  return null;
}

export function ExamImageField({
  label,
  hint,
  imagePath,
  disabled = false,
  uploading = false,
  onFile,
  pendingPreviewUrl,
}: ExamImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const previewUrl = pendingPreviewUrl || resolveMediaUrl(imagePath);

  useEffect(() => {
    setError(null);
  }, [imagePath, pendingPreviewUrl]);

  const pick = (file: File | undefined) => {
    if (!file || disabled || uploading) return;
    const message = validateExamImage(file);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    onFile(file);
  };

  return (
    <div className={cn("space-y-3", disabled && "select-none")}>
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 sm:flex-row sm:items-center">
        <div className="flex h-36 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white sm:w-40">
          {previewUrl ? (
            <RemoteImg
              src={previewUrl}
              alt={label}
              className="size-full object-contain"
              fallback={
                <div className="flex size-full flex-col items-center justify-center gap-1 px-2 text-center">
                  <ImagePlus className="size-6 text-slate-300" />
                  <span className="text-[10px] leading-4 text-slate-400">
                    پیش‌نمایش در دسترس نیست
                  </span>
                </div>
              }
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
            onChange={(event) => {
              pick(event.target.files?.[0]);
              if (inputRef.current) inputRef.current.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="w-fit rounded-xl"
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
          {error ? (
            <p className="text-xs text-rose-600">{error}</p>
          ) : (
            <p className="text-xs text-slate-400">JPG / PNG / WEBP — حداکثر ۸ مگابایت</p>
          )}
        </div>
      </div>
    </div>
  );
}
