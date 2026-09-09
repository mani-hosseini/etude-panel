"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";

import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

export const PDF_MAX_BYTES = 10 * 1024 * 1024;

type PdfDropzoneProps = {
  disabled?: boolean;
  uploading?: boolean;
  currentFileName?: string | null;
  currentFileSize?: number | null;
  emptyLabel?: string;
  onSelect: (file: File) => void;
};

function isPdfFile(file: File) {
  const name = file.name.toLowerCase();
  return file.type === "application/pdf" || name.endsWith(".pdf");
}

export function validatePdfFile(file: File): string | null {
  if (!isPdfFile(file)) return "فقط فایل PDF مجاز است.";
  if (file.size <= 0 || file.size > PDF_MAX_BYTES) {
    return "حجم فایل حداکثر ۱۰ مگابایت باشد.";
  }
  return null;
}

export function PdfDropzone({
  disabled = false,
  uploading = false,
  currentFileName,
  currentFileSize,
  emptyLabel = "فایل PDF را رها کنید یا انتخاب کنید",
  onSelect,
}: PdfDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (file: File | undefined) => {
    if (!file || disabled || uploading) return;
    const message = validatePdfFile(file);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    onSelect(file);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(event) => {
          pick(event.target.files?.[0]);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          pick(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-8 text-center transition",
          dragOver
            ? "border-brand bg-brand/5"
            : "border-slate-300 bg-slate-50/80 hover:border-brand/40 hover:bg-white",
          (disabled || uploading) && "cursor-not-allowed opacity-60",
        )}
      >
        {uploading ? (
          <Loader2 className="size-8 animate-spin text-brand" />
        ) : (
          <FileUp className="size-8 text-brand" />
        )}
        <p className="mt-3 text-sm font-semibold text-slate-800">
          {uploading
            ? "در حال ارسال فایل…"
            : currentFileName
              ? "تعویض فایل PDF"
              : emptyLabel}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          فقط PDF — حداکثر ۱۰ مگابایت
        </p>
        {currentFileName ? (
          <p className="mt-3 max-w-full truncate text-xs text-slate-600">
            فایل فعلی: {currentFileName}
            {typeof currentFileSize === "number"
              ? ` · ${formatBytes(currentFileSize)}`
              : ""}
          </p>
        ) : null}
      </button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
