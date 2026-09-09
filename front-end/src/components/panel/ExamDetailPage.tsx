"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Lock,
  Printer,
} from "lucide-react";

import { ExamStatusBadge } from "@/components/exams/ExamStatusBadge";
import { PdfDropzone } from "@/components/exams/PdfDropzone";
import { PageHeader } from "@/components/panel/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { audienceError } from "@/lib/api/errors";
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
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<
    "exam" | "answer" | "own" | null
  >(null);

  const submit = useMutation({
    mutationFn: (file: File) => api.submitExamPdf(examId, file),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.exam(examId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.exams }),
      ]);
    },
  });

  const downloadFile = async (
    kind: "exam" | "answer" | "own",
    loader: () => Promise<Blob>,
    filename: string,
  ) => {
    setDownloadError(null);
    setDownloading(kind);
    try {
      const blob = await loader();
      saveBlob(blob, filename);
    } catch (error) {
      setDownloadError(audienceError(error, "دانلود فایل انجام نشد."));
    } finally {
      setDownloading(null);
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
          description={
            exam.description ||
            "پاسخ‌نامه را پرینت بگیرید، برگه سوالات را حل کنید و PDF پاسخ را بفرستید."
          }
          actions={<ExamStatusBadge status={exam.status} />}
        />
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
        <span className="rounded-full bg-slate-100 px-3 py-1">
          {exam.submitted ? "پاسخ شما ثبت شده است" : "هنوز پاسخی ارسال نشده"}
        </span>
      </div>

      <section className="rounded-3xl border border-border bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-navy">پاسخ‌نامه برای پرینت</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          این فایل را همین حالا دانلود و پرینت بگیرید؛ لازم نیست اول پاسخ بفرستید.
        </p>
        {exam.hasAnswerFile ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <Printer className="size-5 shrink-0 text-brand" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {exam.answerFileName || "پاسخ‌نامه.pdf"}
                </p>
                {exam.answerFileSize ? (
                  <p className="text-xs text-slate-500">
                    {formatBytes(exam.answerFileSize)}
                  </p>
                ) : null}
              </div>
            </div>
            <Button
              type="button"
              className="rounded-xl"
              disabled={downloading === "answer"}
              onClick={() =>
                void downloadFile(
                  "answer",
                  () => api.downloadExamAnswerKey(examId),
                  exam.answerFileName || "answer-sheet.pdf",
                )
              }
            >
              {downloading === "answer" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              دانلود پاسخ‌نامه
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex h-24 items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">
            پاسخ‌نامه هنوز آپلود نشده است.
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-navy">برگه سوالات</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          فایل PDF سوالات را دانلود کنید، حل کنید و بعد پاسخ خودتان را بفرستید.
        </p>
        {exam.hasExamFile ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <FileText className="size-5 shrink-0 text-brand" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {exam.examFileName || "برگه سوالات.pdf"}
                </p>
                {exam.examFileSize ? (
                  <p className="text-xs text-slate-500">
                    {formatBytes(exam.examFileSize)}
                  </p>
                ) : null}
              </div>
            </div>
            <Button
              type="button"
              className="rounded-xl"
              disabled={downloading === "exam"}
              onClick={() =>
                void downloadFile(
                  "exam",
                  () => api.downloadExamPaper(examId),
                  exam.examFileName || "exam.pdf",
                )
              }
            >
              {downloading === "exam" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              دانلود برگه سوالات
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex h-24 items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">
            برگه سوالات هنوز آماده نشده است.
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-navy">ارسال پاسخ PDF</h3>
        {exam.canSubmit ? (
          <>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              بعد از حل آزمون، فقط یک فایل PDF بفرستید. تا وقتی آزمون باز است
              می‌توانید فایل را عوض کنید. فایل شما فقط برای ادمین دیده می‌شود.
            </p>
            <div className="mt-4">
              <PdfDropzone
                uploading={submit.isPending}
                currentFileName={exam.submission?.originalName}
                currentFileSize={exam.submission?.size}
                emptyLabel="فایل PDF پاسخ را رها کنید یا انتخاب کنید"
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
              {exam.status === "CLOSED"
                ? "این آزمون بسته شده است."
                : !exam.hasExamFile
                  ? "برگه سوالات هنوز آماده نشده است. می‌توانید پاسخ‌نامه را دانلود و پرینت بگیرید."
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
              disabled={downloading === "own"}
              onClick={() =>
                void downloadFile(
                  "own",
                  () => api.downloadOwnExamPdf(examId),
                  exam.submission?.originalName || "exam-answers.pdf",
                )
              }
            >
              {downloading === "own" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              دانلود فایل من
            </Button>
          </div>
        ) : null}
      </section>

      {downloadError ? (
        <p className="text-sm text-rose-600">{downloadError}</p>
      ) : null}
    </div>
  );
}
