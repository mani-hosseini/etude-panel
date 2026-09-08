"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Loader2, Search } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ExamImageField } from "@/components/admin/exam/ExamImageField";
import {
  EXAM_STATUS_LABEL,
  type ExamStatusValue,
} from "@/components/exams/ExamStatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  adminApi,
  type AdminExamDetail,
  type ExamStatus,
} from "@/lib/api/admin-client";
import { adminQueryKeys, useAdminExamQuery } from "@/lib/api/admin-queries";
import { audienceError } from "@/lib/api/errors";
import { saveBlob } from "@/lib/download";
import { formatBytes, formatDateTimeFa, toFa } from "@/lib/format";
import { adminRoutes } from "@/lib/routes";

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

type AdminExamEditorPageProps = {
  examId?: string;
};

export function AdminExamEditorPage({ examId }: AdminExamEditorPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isNew = !examId;
  const query = useAdminExamQuery(examId ?? "");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ExamStatus>("DRAFT");
  const [dueLocal, setDueLocal] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [examFile, setExamFile] = useState<File | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [examPreview, setExamPreview] = useState<string | null>(null);
  const [answerPreview, setAnswerPreview] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (examPreview) URL.revokeObjectURL(examPreview);
      if (answerPreview) URL.revokeObjectURL(answerPreview);
    };
  }, [examPreview, answerPreview]);

  useEffect(() => {
    if (!query.data || hydrated) return;
    setTitle(query.data.title);
    setDescription(query.data.description);
    setStatus(query.data.status);
    setDueLocal(toDatetimeLocal(query.data.dueAt));
    setHydrated(true);
  }, [query.data, hydrated]);

  const save = useMutation({
    mutationFn: async () => {
      const dueAt = fromDatetimeLocal(dueLocal);
      if (isNew) {
        const created = await adminApi.createExam({
          title: title.trim(),
          description: description.trim(),
          dueAt,
          status: "DRAFT",
        });
        try {
          if (examFile) await adminApi.uploadExamImage(created.id, examFile);
          if (answerFile) {
            await adminApi.uploadExamAnswerImage(created.id, answerFile);
          }
          if (status !== "DRAFT") {
            await adminApi.updateExam(created.id, {
              title: title.trim(),
              description: description.trim(),
              dueAt,
              status,
            });
          }
          return created.id;
        } catch (error) {
          const wrapped = error instanceof Error ? error : new Error("آپلود ناموفق بود.");
          (wrapped as Error & { examId?: string }).examId = created.id;
          throw wrapped;
        }
      }

      const updated = await adminApi.updateExam(examId, {
        title: title.trim(),
        description: description.trim(),
        dueAt,
        status,
      });
      return updated.id;
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "exams"] });
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.exam(id) });
      if (isNew) router.replace(adminRoutes.exam(id));
    },
    onError: (error) => {
      const examIdFromError = (error as Error & { examId?: string }).examId;
      if (examIdFromError) {
        void queryClient.invalidateQueries({ queryKey: ["admin", "exams"] });
        router.replace(adminRoutes.exam(examIdFromError));
      }
    },
  });

  const uploadExamImage = useMutation({
    mutationFn: (file: File) => adminApi.uploadExamImage(examId!, file),
    onSuccess: async (exam) => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.exam(exam.id) });
    },
  });

  const uploadAnswerImage = useMutation({
    mutationFn: (file: File) => adminApi.uploadExamAnswerImage(examId!, file),
    onSuccess: async (exam) => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.exam(exam.id) });
    },
  });

  const detail = query.data as AdminExamDetail | undefined;
  const filteredSubmissions = useMemo(() => {
    const rows = detail?.submissions ?? [];
    const q = search.trim();
    if (!q) return rows;
    return rows.filter((row) =>
      `${row.student.displayName} ${row.student.studentCode ?? ""} ${row.originalName}`
        .includes(q),
    );
  }, [detail?.submissions, search]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (title.trim().length < 2) {
      setFormError("عنوان آزمون را وارد کنید.");
      return;
    }
    const hasExamImage = Boolean(examFile || detail?.examImagePath);
    const hasAnswerImage = Boolean(answerFile || detail?.answerImagePath);
    if (status !== "DRAFT" && (!hasExamImage || !hasAnswerImage)) {
      setFormError("برای انتشار، عکس برگه و پاسخ‌نامه را آپلود کنید.");
      return;
    }
    save.mutate();
  };

  const downloadSubmission = async (
    submissionId: string,
    filename: string,
  ) => {
    if (!examId) return;
    setDownloadingId(submissionId);
    try {
      const blob = await adminApi.downloadExamSubmission(examId, submissionId);
      saveBlob(blob, filename);
    } catch (error) {
      setFormError(audienceError(error, "دانلود فایل انجام نشد."));
    } finally {
      setDownloadingId(null);
    }
  };

  if (!isNew && query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (!isNew && query.isError) {
    return (
      <Card className="rounded-2xl border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {audienceError(query.error, "آزمون یافت نشد.")}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="ارزیابی هنرجویان"
        title={isNew ? "آزمون جدید" : title || "جزئیات آزمون"}
        description="عکس برگه و پاسخ‌نامه را بارگذاری کنید؛ PDF هنرجویان فقط در همین پنل دیده می‌شود."
        backHref={adminRoutes.exams}
        backLabel="همه آزمون‌ها"
      />

      <form onSubmit={onSubmit} className="space-y-5">
        <Card className="space-y-4 rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="exam-title">عنوان</Label>
            <Input
              id="exam-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="مثلاً آزمون ریتم جلسه چهارم"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exam-desc">توضیح (اختیاری)</Label>
            <Textarea
              id="exam-desc"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="راهنمای کوتاه برای هنرجو"
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>وضعیت</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as ExamStatus)}
              >
                <SelectTrigger className="h-12 rounded-xl bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(EXAM_STATUS_LABEL) as ExamStatusValue[]).map(
                    (key) => (
                      <SelectItem key={key} value={key}>
                        {EXAM_STATUS_LABEL[key]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exam-due">مهلت ارسال (اختیاری)</Label>
              <Input
                id="exam-due"
                type="datetime-local"
                dir="ltr"
                value={dueLocal}
                onChange={(event) => setDueLocal(event.target.value)}
              />
            </div>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
            <ExamImageField
              label="عکس برگه آزمون"
              hint="همین تصویر برای هنرجو نمایش داده می‌شود."
              imagePath={detail?.examImagePath ?? null}
              pendingPreviewUrl={examPreview}
              uploading={uploadExamImage.isPending}
              onFile={(file) => {
                if (isNew) {
                  if (examPreview) URL.revokeObjectURL(examPreview);
                  setExamFile(file);
                  setExamPreview(URL.createObjectURL(file));
                  return;
                }
                uploadExamImage.mutate(file);
              }}
            />
            {uploadExamImage.isError ? (
              <p className="mt-2 text-xs text-rose-600">
                {audienceError(uploadExamImage.error, "آپلود برگه انجام نشد.")}
              </p>
            ) : null}
          </Card>
          <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
            <ExamImageField
              label="عکس پاسخ‌نامه"
              hint="بعد از ارسال PDF هنرجو، این تصویر برایش باز می‌شود."
              imagePath={detail?.answerImagePath ?? null}
              pendingPreviewUrl={answerPreview}
              uploading={uploadAnswerImage.isPending}
              onFile={(file) => {
                if (isNew) {
                  if (answerPreview) URL.revokeObjectURL(answerPreview);
                  setAnswerFile(file);
                  setAnswerPreview(URL.createObjectURL(file));
                  return;
                }
                uploadAnswerImage.mutate(file);
              }}
            />
            {uploadAnswerImage.isError ? (
              <p className="mt-2 text-xs text-rose-600">
                {audienceError(
                  uploadAnswerImage.error,
                  "آپلود پاسخ‌نامه انجام نشد.",
                )}
              </p>
            ) : null}
          </Card>
        </div>

        {formError || save.isError ? (
          <p className="text-sm text-rose-600">
            {formError ||
              audienceError(save.error, "ذخیره آزمون انجام نشد.")}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="rounded-xl" disabled={save.isPending}>
            {save.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            {isNew ? "ایجاد آزمون" : "ذخیره تغییرات"}
          </Button>
          <Button asChild type="button" variant="outline" className="rounded-xl">
            <Link href={adminRoutes.exams}>انصراف</Link>
          </Button>
        </div>
      </form>

      {!isNew ? (
        <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                پاسخ‌های ارسال‌شده
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {toFa(detail?.submissionsCount ?? 0)} فایل PDF از هنرجویان
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="جستجو هنرجو…"
                className="h-10 rounded-xl bg-white ps-10"
              />
            </div>
          </div>
          {filteredSubmissions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <FileText className="size-8 text-slate-300" />
              <p className="text-sm text-slate-500">هنوز فایلی ارسال نشده.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-right text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">هنرجو</th>
                    <th className="px-4 py-3 font-medium">فایل</th>
                    <th className="px-4 py-3 font-medium">زمان ارسال</th>
                    <th className="px-4 py-3 font-medium">دانلود</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {row.student.displayName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {row.student.studentCode || "بدون کد هنرجویی"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="truncate text-slate-700">
                          {row.originalName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatBytes(row.size)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDateTimeFa(row.submittedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          disabled={downloadingId === row.id}
                          onClick={() =>
                            void downloadSubmission(row.id, row.originalName)
                          }
                        >
                          {downloadingId === row.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Download className="size-4" />
                          )}
                          دانلود
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
