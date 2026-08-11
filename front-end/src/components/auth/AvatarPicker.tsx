"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_BYTES = 1 * 1024 * 1024;

type AvatarPickerProps = {
  value: File | null;
  onChange: (file: File | null) => void;
  fallbackInitial?: string;
  disabled?: boolean;
  className?: string;
};

export function AvatarPicker({
  value,
  onChange,
  fallbackInitial = "ه",
  disabled = false,
  className,
}: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const onPick = (file: File | undefined) => {
    if (!file || disabled) return;
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("حجم تصویر حداکثر ۱ مگابایت باشد.");
      return;
    }
    onChange(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative">
        <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-brand-100 bg-brand-50/50 text-2xl font-bold text-brand shadow-sm">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="پیش‌نمایش عکس پروفایل"
              className="size-full object-cover"
            />
          ) : fallbackInitial ? (
            <span>{fallbackInitial}</span>
          ) : (
            <UserRound className="size-8 text-brand/40" strokeWidth={1.5} />
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={disabled}
          onChange={(e) => onPick(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-1 -right-1 inline-flex size-8 items-center justify-center rounded-full bg-brand text-white shadow-md ring-2 ring-white disabled:opacity-60"
          aria-label="انتخاب عکس پروفایل"
        >
          {disabled ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Camera className="size-3.5" />
          )}
        </button>
      </div>
      <p className="text-center text-[11px] text-muted-foreground">
        عکس پروفایل (اختیاری) · JPG / PNG · حداکثر ۱ مگابایت
      </p>
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 rounded-xl text-muted-foreground"
          disabled={disabled}
          onClick={() => onChange(null)}
        >
          <Trash2 className="size-3.5" />
          حذف عکس
        </Button>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
