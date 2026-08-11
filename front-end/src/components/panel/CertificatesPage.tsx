"use client";

import Link from "next/link";
import { Award, Presentation } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { PageHeader } from "@/components/panel/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  queryErrorMessage,
  useCoursesQuery,
} from "@/lib/api/queries";
import { toFa } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function CertificatesPage() {
  const reduceMotion = useReducedMotion();
  const query = useCoursesQuery();

  if (query.isPending) {
    return <Skeleton className="h-64 rounded-3xl" />;
  }

  if (query.isError) {
    return (
      <div className="surface-panel p-8 text-center text-sm text-destructive">
        {queryErrorMessage(query.error)}
      </div>
    );
  }

  const courses = query.data.courses;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="دستاوردها"
        title="مدارک"
        description="مدارک پایان دورهٔ دوره‌هایی که در آن‌ها ثبت‌نام کرده‌اید."
      />

      {courses.length === 0 ? (
        <div className="surface-panel p-10 text-center text-sm text-muted-foreground">
          هنوز دوره‌ای ثبت نشده است.
        </div>
      ) : (
        <div className="grid gap-4">
          {courses.map((course, index) => (
            <motion.article
              key={course.id}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="surface-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
                  <Award className="size-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">
                      {course.title}
                    </h3>
                    <Badge
                      variant={course.certificateReady ? "default" : "secondary"}
                      className="rounded-lg"
                    >
                      {course.certificateReady ? "آماده دریافت" : "در حال تکمیل"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {course.teacher}
                  </p>
                  <p className="mt-2 font-sans text-xs font-semibold tabular-nums text-navy">
                    پیشرفت: {toFa(course.sessionsDone)}/{toFa(course.sessionsTotal)}{" "}
                    جلسه
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!course.certificateReady}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold",
                    course.certificateReady
                      ? "bg-brand text-white"
                      : "cursor-not-allowed bg-muted text-muted-foreground",
                  )}
                >
                  <Presentation className="size-4" />
                  {course.certificateReady ? "دریافت مدرک" : "هنوز آماده نیست"}
                </button>
                <Link
                  href={routes.courseSessions(course.id)}
                  className="rounded-2xl px-3 py-3 text-xs font-semibold text-brand"
                >
                  جلسات دوره
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}
