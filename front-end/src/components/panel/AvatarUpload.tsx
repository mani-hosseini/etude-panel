"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { ApiError, resolveMediaUrl } from "@/lib/api/http";
import { cn } from "@/lib/utils";

const MAX_BYTES = 1 * 1024 * 1024;

type AvatarUploadProps = {
  avatarUrl: string | null | undefined;
  fallbackInitial: string;
  onChanged: (avatarUrl: string | null) => void;
  className?: string;
  sizeClassName?: string;
};

export function AvatarUpload({
  avatarUrl,
  fallbackInitial,
  onChanged,
  className,
  sizeClassName = "size-24",
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = resolveMediaUrl(avatarUrl);

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("حجم تصویر حداکثر ۱ مگابایت باشد.");
      return;
    }
    setUploading(true);
    try {
      const result = await api.uploadAvatar(file);
      onChanged(result.avatarUrl);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "آپلود تصویر ناموفق بود.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onRemove = async () => {
    setError(null);
    setUploading(true);
    try {
      await api.deleteAvatar();
      onChanged(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "حذف تصویر ناموفق بود.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative">
        <div
          className={cn(
            "flex items-center justify-center overflow-hidden rounded-[1.35rem] bg-white text-3xl font-bold text-brand shadow-lg",
            sizeClassName,
          )}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="عکس پروفایل"
              className="size-full object-cover"
            />
          ) : (
            <span>{fallbackInitial}</span>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={uploading}
          onChange={(e) => void onPick(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-1 -right-1 inline-flex size-9 items-center justify-center rounded-full bg-brand text-white shadow-md ring-2 ring-white disabled:opacity-60"
          aria-label="آپلود عکس پروفایل"
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Camera className="size-4" />
          )}
        </button>
      </div>
      <p className="text-[11px] text-white/75">JPG / PNG — حداکثر ۱ مگابایت</p>
      {avatarUrl ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 rounded-xl text-white/80 hover:bg-white/10 hover:text-white"
          disabled={uploading}
          onClick={() => void onRemove()}
        >
          <Trash2 className="size-3.5" />
          حذف عکس
        </Button>
      ) : null}
      {error ? <p className="text-xs text-rose-200">{error}</p> : null}
    </div>
  );
}
