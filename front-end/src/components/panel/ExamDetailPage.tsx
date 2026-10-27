"use client";

import { useState, type ReactNode } from "react";
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

import { ExamScoreRing } from "@/components/exams/ExamScoreRing";
import { ExamStatusBadge } from "@/components/exams/ExamStatusBadge";
import { PdfDropzone } from "@/components/exams/PdfDropzone";
import { PageHeader } from "@/components/panel/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { audienceError } from "@/lib/api/errors";
import { queryKeys, useExamQuery } from "@/lib/api/queries";
import { saveBlob } from "@/lib/download";
import {
  displayPdfName,
  formatBytes,
  formatDateTimeFa,
  formatExamScore,
} from "@/lib/format";
import { announceSaved } from "@/lib/save-feedback";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

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
      announceSaved("پاسخ شما با موفقیت ثبت شد.");
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
  const examName = displayPdfName(exam.examFileName, "برگه-آزمون.pdf");
  const answerName = displayPdfName(exam.answerFileName, "پاسخ-نامه.pdf");
  const ownName = displayPdfName(
    exam.submission?.originalName,
    "پاسخ-آزمون.pdf",
  );
  const graded = exam.score != null;

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
            "نمره میان‌ترم جدا از ارسال PDF ثبت می‌شود. برگه را حل کنید و اگر لازم بود پاسخ را بفرستید."
          }
          actions={<ExamStatusBadge status={exam.status} />}
        />
      </div>

      <section className="overflow-hidden rounded-3xl border border-border bg-white shadow-soft">
        <div className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="rounded-full bg-linear-to-b from-brand/10 to-slate-50 p-2">
              <ExamScoreRing score={exam.score} size={124} />
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-brand">
                نمره میان‌ترم
              </p>
              <p className="mt-1 text-lg font-bold text-navy">
                {graded ? formatExamScore(exam.score) : "هنوز ثبت نشده"}
              </p>
              <p className="mt-1 max-w-[38ch] text-sm leading-6 text-muted-foreground">
                {graded
                  ? exam.gradedAt
                    ? `ثبت در ${formatDateTimeFa(exam.gradedAt)}`
                    : "نمره توسط آموزشگاه ثبت شده است."
                  : "بعد از تصحیح، نمره اینجا دیده می‌شود؛ لازم نیست حتماً PDF فرستاده باشید."}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs",
              exam.submitted
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-600",
            )}
          >
            {exam.submitted ? "پاسخ PDF ثبت شده" : "بدون ارسال PDF"}
          </span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <FileCard
          icon={<Printer className="size-4" />}
          title="پاسخ‌نامه برای پرینت"
          ready={exam.hasAnswerFile}
          missing="پاسخ‌نامه هنوز آماده نیست."
          name={answerName}
          size={exam.answerFileSize}
          downloading={downloading === "answer"}
          actionLabel="دانلود پاسخ‌نامه"
          onDownload={() =>
            void downloadFile(
              "answer",
              () => api.downloadExamAnswerKey(examId),
              answerName,
            )
          }
        />
        <FileCard
          icon={<FileText className="size-4" />}
          title="برگه سوالات"
          ready={exam.hasExamFile}
          missing="برگه سوالات هنوز آماده نیست."
          name={examName}
          size={exam.examFileSize}
          downloading={downloading === "exam"}
          actionLabel="دانلود برگه سوالات"
          onDownload={() =>
            void downloadFile(
              "exam",
              () => api.downloadExamPaper(examId),
              examName,
            )
          }
        />
      </div>

      <section className="rounded-3xl border border-border bg-white p-5 shadow-soft">
        <h3 className="text-sm font-bold text-navy">ارسال پاسخ PDF</h3>
        {exam.canSubmit ? (
          <>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              اگر آزمون کتبی است، PDF پاسخ را بفرستید. نمره جداگانه توسط ادمین
              ثبت می‌شود.
            </p>
            <div className="mt-4">
              <PdfDropzone
                uploading={submit.isPending}
                currentFileName={exam.submission ? ownName : null}
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
                {ownName}
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
                  ownName,
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

function FileCard({
  icon,
  title,
  ready,
  missing,
  name,
  size,
  downloading,
  actionLabel,
  onDownload,
}: {
  icon: ReactNode;
  title: string;
  ready: boolean;
  missing: string;
  name: string;
  size: number | null;
  downloading: boolean;
  actionLabel: string;
  onDownload: () => void;
}) {
  return (
    <section className="rounded-3xl border border-border bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-white">
          {icon}
        </span>
        <h3 className="text-sm font-bold text-navy">{title}</h3>
      </div>
      {ready ? (
        <div className="flex flex-col gap-3">
          <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
          {size ? (
            <p className="text-xs text-slate-500">{formatBytes(size)}</p>
          ) : null}
          <Button
            type="button"
            className="rounded-xl"
            disabled={downloading}
            onClick={onDownload}
          >
            {downloading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {actionLabel}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-slate-500">{missing}</p>
      )}
    </section>
  );
}
