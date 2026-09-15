"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ClipboardCheck,
  FileUp,
  GraduationCap,
} from "lucide-react";

import { ExamScoreRing } from "@/components/exams/ExamScoreRing";
import { ExamStatusBadge } from "@/components/exams/ExamStatusBadge";
import { PageHeader } from "@/components/panel/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/constants/copy";
import { queryErrorMessage, useExamsQuery } from "@/lib/api/queries";
import { formatExamScoreValue, toFa, EXAM_SCORE_MAX } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function ExamsPage() {
  const reduceMotion = useReducedMotion();
  const query = useExamsQuery();

  if (query.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-40 rounded-3xl" />
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
  const graded = exams.filter((exam) => exam.score != null);
  const average =
    graded.length === 0
      ? null
      : graded.reduce((sum, exam) => sum + (exam.score ?? 0), 0) / graded.length;

  return (
    <div className="space-y-6 pb-4 sm:space-y-8">
      <PageHeader
        eyebrow={copy.academyName}
        title="آزمون‌ها و نمره‌ها"
        description="برگه و پاسخ‌نامه را بگیرید، اگر لازم بود PDF بفرستید، و نمره میان‌ترم را همین‌جا ببینید."
      />

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="brand-gradient relative overflow-hidden rounded-3xl p-5 text-white shadow-lift sm:p-7"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 bottom-0 h-36 w-36 rounded-full bg-black/10 blur-2xl"
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs text-white/70">کارنامه میان‌ترم</p>
            <h3 className="mt-1 text-xl font-bold sm:text-2xl">
              نمره جدا از ارسال PDF ثبت می‌شود
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-7 text-white/80">
              حتی اگر پاسخ‌نامه نفرستاده باشید، نمره شما اینجا دیده می‌شود.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "آزمون‌ها", value: String(exams.length) },
              { label: "در انتظار ارسال", value: String(openCount) },
              {
                label: "میانگین",
                value:
                  average == null ? "—" : formatExamScoreValue(average),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-white/10 px-3 py-2.5 text-center backdrop-blur-sm"
              >
                <p className="text-[11px] text-white/65">{item.label}</p>
                <p className="mt-1 font-sans text-lg font-bold tabular-nums">
                  {toFa(item.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {exams.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-white px-6 py-16 text-center shadow-soft">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <ClipboardCheck className="size-7" />
          </span>
          <p className="text-sm font-semibold text-navy">آزمونی منتشر نشده</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            به‌محض انتشار آزمون، برگه، پاسخ‌نامه و نمره میان‌ترم اینجا می‌آید.
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
                className="group grid overflow-hidden rounded-3xl border border-border bg-white shadow-soft transition hover:border-brand/30 hover:shadow-lift sm:grid-cols-[9rem_1fr]"
              >
                <div className="flex items-center justify-center bg-linear-to-b from-brand/10 to-slate-50 py-5 sm:py-0">
                  <ExamScoreRing score={exam.score} size={108} />
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
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
                        exam.submitted
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {exam.submitted ? (
                        <GraduationCap className="size-3.5" />
                      ) : (
                        <FileUp className="size-3.5" />
                      )}
                      {exam.submitted ? "پاسخ PDF ثبت شده" : "بدون ارسال PDF"}
                    </span>
                    {exam.score != null ? (
                      <span className="rounded-full bg-brand/10 px-2.5 py-1 font-semibold text-brand">
                        نمره {formatExamScoreValue(exam.score)} از {toFa(EXAM_SCORE_MAX)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">
                        نمره هنوز ثبت نشده
                      </span>
                    )}
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
