"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronRight,
  Download,
  ImageIcon,
  Lock,
} from "lucide-react";

import { ExamImageLightbox } from "@/components/exams/ExamImageLightbox";
import { ExamStatusBadge } from "@/components/exams/ExamStatusBadge";
import { PdfDropzone } from "@/components/exams/PdfDropzone";
import { RemoteImg } from "@/components/media/remote-img";
import { PageHeader } from "@/components/panel/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { audienceError } from "@/lib/api/errors";
import { resolveMediaUrl } from "@/lib/api/http";
import { queryKeys, useExamQuery } from "@/lib/api/queries";
import { saveBlob } from "@/lib/download";
import { formatBytes, formatDateTimeFa } from "@/lib/format";
import { routes } from "@/lib/routes";

type ExamDetailPageProps = {
  examId: string;
};

export function ExamDetailPage({ examId }: ExamDetailPageProps) {
  const queryClient = useQueryClient();
  const query = useExamQuery(examId);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(
    null,
  );
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: (file: File) => api.submitExamPdf(examId, file),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.exam(examId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.exams }),
      ]);
    },
  });

  const downloadOwn = async () => {
    setDownloadError(null);
    try {
      const blob = await api.downloadOwnExamPdf(examId);
      const name = query.data?.submission?.originalName || "exam-answers.pdf";
      saveBlob(blob, name);
    } catch (error) {
      setDownloadError(audienceError(error, "دانلود فایل انجام نشد."));
    }
  };

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="space-y-4">
        <Link
          href={routes.exams}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand"
        >
          <ChevronRight className="size-4" />
          بازگشت به آزمون‌ها
        </Link>
        <div className="surface-panel p-8 text-center text-sm text-destructive">
          {audienceError(query.error, "آزمون یافت نشد.")}
        </div>
      </div>
    );
  }

  const exam = query.data;
  const examSrc = resolveMediaUrl(exam.examImagePath);
  const answerSrc = exam.answersVisible
    ? resolveMediaUrl(exam.answerImagePath)
    : null;

  return (
    <div className="space-y-6 pb-4">
      <div>
        <Link
          href={routes.exams}
          className="mb-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand"
        >
          <ChevronRight className="size-3.5" />
          آزمون‌ها
        </Link>
        <PageHeader
          title={exam.title}
          description={exam.description || "برگه آزمون را ببینید و فایل PDF پاسخ را ارسال کنید."}
          actions={<ExamStatusBadge status={exam.status} />}
        />
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
        <span className="rounded-full bg-slate-100 px-3 py-1">
          مهلت: {exam.dueAt ? formatDateTimeFa(exam.dueAt) : "بدون محدودیت زمانی"}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1">
          {exam.submitted ? "پاسخ شما ثبت شده است" : "هنوز پاسخی ارسال نشده"}
        </span>
      </div>

      <section className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-sm font-bold text-navy">برگه آزمون</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            برای بزرگ‌نمایی روی تصویر بزنید.
          </p>
        </div>
        <div className="p-4 sm:p-5">
          {examSrc ? (
            <button
              type="button"
              onClick={() => setLightbox({ src: examSrc, alt: exam.title })}
              className="block w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
            >
              <RemoteImg
                src={examSrc}
                alt={exam.title}
                className="max-h-[32rem] w-full object-contain"
                fallback={
                  <div className="flex h-56 flex-col items-center justify-center gap-2 text-slate-400">
                    <ImageIcon className="size-8" />
                    <span className="text-xs">تصویر در دسترس نیست</span>
                  </div>
                }
              />
            </button>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">
              برگه آزمون هنوز آماده نشده است.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-navy">ارسال پاسخ PDF</h3>
        {exam.canSubmit ? (
          <>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              بعد از حل آزمون، فقط یک فایل PDF بفرستید. تا قبل از پایان مهلت
              می‌توانید فایل را عوض کنید.
            </p>
            <div className="mt-4">
              <PdfDropzone
                uploading={submit.isPending}
                currentFileName={exam.submission?.originalName}
                currentFileSize={exam.submission?.size}
                onSelect={(file) => submit.mutate(file)}
              />
            </div>
            {submit.isError ? (
              <p className="mt-3 text-xs text-rose-600">
                {audienceError(submit.error, "ارسال فایل انجام نشد.")}
              </p>
            ) : null}
            {submit.isSuccess ? (
              <p className="mt-3 inline-flex items-center gap-1 text-xs text-emerald-700">
                <CheckCircle2 className="size-3.5" />
                پاسخ شما با موفقیت ثبت شد.
              </p>
            ) : null}
          </>
        ) : (
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <Lock className="mt-0.5 size-4 shrink-0" />
            <p>
              {exam.duePassed || exam.status === "CLOSED"
                ? "مهلت ارسال این آزمون تمام شده است."
                : "ارسال پاسخ برای این آزمون در حال حاضر ممکن نیست."}
            </p>
          </div>
        )}

        {exam.submission ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-emerald-900">
                {exam.submission.originalName}
              </p>
              <p className="text-xs text-emerald-700">
                {formatBytes(exam.submission.size)} ·{" "}
                {formatDateTimeFa(exam.submission.submittedAt)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => void downloadOwn()}
            >
              <Download className="size-4" />
              دانلود فایل من
            </Button>
          </div>
        ) : null}
        {downloadError ? (
          <p className="mt-2 text-xs text-rose-600">{downloadError}</p>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-sm font-bold text-navy">پاسخ‌نامه</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {exam.answersVisible
              ? "بعد از ارسال پاسخ، می‌توانید پاسخ‌نامه را ببینید."
              : "پاسخ‌نامه بعد از ارسال فایل PDF نمایش داده می‌شود."}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          {answerSrc ? (
            <button
              type="button"
              onClick={() =>
                setLightbox({ src: answerSrc, alt: `پاسخ‌نامه ${exam.title}` })
              }
              className="block w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
            >
              <RemoteImg
                src={answerSrc}
                alt={`پاسخ‌نامه ${exam.title}`}
                className="max-h-[32rem] w-full object-contain"
                fallback={
                  <div className="flex h-56 items-center justify-center text-sm text-slate-500">
                    تصویر پاسخ‌نامه در دسترس نیست.
                  </div>
                }
              />
            </button>
          ) : (
            <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl bg-slate-50 text-sm text-slate-500">
              <Lock className="size-5" />
              پاسخ‌نامه هنوز برای شما باز نشده است.
            </div>
          )}
        </div>
      </section>

      {lightbox ? (
        <ExamImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </div>
  );
}
