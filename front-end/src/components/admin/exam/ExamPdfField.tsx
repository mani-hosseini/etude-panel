"use client";

import { Download, Loader2 } from "lucide-react";

import { PdfDropzone } from "@/components/exams/PdfDropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type ExamPdfFieldProps = {
  label: string;
  hint: string;
  fileName: string | null;
  fileSize: number | null;
  uploading?: boolean;
  downloading?: boolean;
  onFile: (file: File) => void;
  onDownload?: () => void;
};

export function ExamPdfField({
  label,
  hint,
  fileName,
  fileSize,
  uploading = false,
  downloading = false,
  onFile,
  onDownload,
}: ExamPdfFieldProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <PdfDropzone
        uploading={uploading}
        currentFileName={fileName}
        currentFileSize={fileSize}
        emptyLabel={`PDF ${label} را انتخاب کنید`}
        onSelect={onFile}
      />
      {fileName && onDownload ? (
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          disabled={downloading}
          onClick={onDownload}
        >
          {downloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          دانلود فایل فعلی
        </Button>
      ) : null}
    </div>
  );
}
