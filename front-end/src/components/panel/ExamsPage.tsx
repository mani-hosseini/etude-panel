"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileText,
} from "lucide-react";

import { ExamStatusBadge } from "@/components/exams/ExamStatusBadge";
import { PageHeader } from "@/components/panel/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/constants/copy";
import { queryErrorMessage, useExamsQuery } from "@/lib/api/queries";
import { toFa } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function ExamsPage() {
  const reduceMotion = useReducedMotion();
  const query = useExamsQuery();

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="surface-panel p-8 text-center text-sm text-destructive">
        {queryErrorMessage(query.error)}
      </div>
    );
  }

  const exams = query.data.exams;
  const openCount = exams.filter((exam) => exam.canSubmit && !exam.submitted)
    .length;

  return (
    <div className="space-y-6 pb-4 sm:space-y-8">
      <PageHeader
        eyebrow={copy.academyName}
        title="آزمون‌ها"
        description="پاسخ‌نامه را دانلود و پرینت بگیرید، برگه سوالات را حل کنید و PDF پاسخ را از داشبورد بفرستید."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white px-4 py-3">
          <p className="text-xs text-muted-foreground">کل آزمون‌ها</p>
          <p className="mt-1 text-2xl font-bold text-navy">{toFa(exams.length)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white px-4 py-3">
          <p className="text-xs text-muted-foreground">در انتظار ارسال</p>
          <p className="mt-1 text-2xl font-bold text-brand">{toFa(openCount)}</p>
        </div>
      </div>

      {exams.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <ClipboardCheck className="size-10 text-slate-300" />
          <p className="text-sm text-muted-foreground">
            هنوز آزمونی برای شما منتشر نشده است.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {exams.map((exam, index) => (
            <motion.div
              key={exam.id}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.04 }}
            >
              <Link
                href={routes.exam(exam.id)}
                className="group grid overflow-hidden rounded-3xl border border-border bg-white shadow-sm transition hover:border-brand/30 hover:shadow-md sm:grid-cols-[7rem_1fr]"
              >
                <div className="flex h-28 items-center justify-center bg-brand/5 sm:h-auto">
                  <FileText className="size-8 text-brand" />
                </div>
                <div className="flex flex-col gap-3 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-navy">
                        {exam.title}
                      </h3>
                      {exam.description ? (
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                          {exam.description}
                        </p>
                      ) : null}
                    </div>
                    <ExamStatusBadge status={exam.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
                        exam.submitted
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700",
                      )}
                    >
                      <CheckCircle2 className="size-3.5" />
                      {exam.submitted ? "ارسال شده" : "ارسال نشده"}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
                    مشاهده آزمون
                    <ArrowLeft className="size-4 transition group-hover:-translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
