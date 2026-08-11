"use client";

import { useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Lock,
  MapPin,
  UserRound,
} from "lucide-react";

import { PageHeader } from "@/components/panel/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  queryErrorMessage,
  useScheduleQuery,
} from "@/lib/api/queries";
import { cleanCourseTitle, toFa, weekdayPlural } from "@/lib/format";
import { pickScheduleWindow, scheduleLessonLabel } from "@/lib/schedule-window";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const statusBadge = {
  done: { label: "برگزار شده", variant: "success" as const },
  next: { label: "جلسهٔ بعدی", variant: "default" as const },
  planned: { label: "برنامهٔ آینده", variant: "secondary" as const },
};

function ScheduleContent({ courseId }: { courseId?: string }) {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryCourseId = searchParams.get("courseId");

  useEffect(() => {
    if (!courseId && queryCourseId) {
      router.replace(routes.courseSchedule(queryCourseId));
    }
  }, [courseId, queryCourseId, router]);

  const resolvedCourseId = courseId ?? queryCourseId ?? undefined;
  const query = useScheduleQuery(resolvedCourseId);

  useEffect(() => {
    if (courseId || queryCourseId) return;
    if (!query.isSuccess) return;
    router.replace(routes.courseSchedule(query.data.course.id));
  }, [courseId, queryCourseId, query.isSuccess, query.data, router]);

  const windowLessons = useMemo(
    () => (query.data ? pickScheduleWindow(query.data.lessons) : []),
    [query.data],
  );

  if (!courseId && (queryCourseId || query.isSuccess)) {
    return <Skeleton className="h-64 rounded-3xl" />;
  }

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

  const { course, sessions } = query.data;
  const progressPct = course.progress;
  const remaining = course.sessionsTotal - course.sessionsDone;
  const courseTitle = cleanCourseTitle(course.title);

  return (
    <div className="space-y-6 pb-4 sm:space-y-8">
      <PageHeader
        eyebrow="برنامه کلاس‌ها"
        title={courseTitle}
        description={`${course.teacher} · ${weekdayPlural(course.day)} ${course.time}`}
      />

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="brand-gradient relative overflow-hidden rounded-3xl p-5 text-white shadow-lift sm:p-7"
      >
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs text-white/70">برنامه هفتگی این دوره</p>
            <h3 className="mt-1 text-xl font-bold sm:text-2xl">
              هر {course.day} · {course.time}
            </h3>
            <p className="mt-2 text-sm text-white/80">
              {course.teacher} · {course.room}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "ساعت", value: course.timeShort },
              { label: "مدت", value: course.duration },
              { label: "پیشرفت", value: `${progressPct}٪` },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-white/10 px-3 py-2.5 text-center"
              >
                <p className="text-[11px] text-white/65">{item.label}</p>
                <p className="mt-1 font-sans text-sm font-bold tabular-nums">
                  {toFa(item.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <section className="surface-panel p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-bold">پیشرفت جلسات</h3>
          <p className="font-sans text-xs tabular-nums text-muted-foreground">
            {toFa(course.sessionsDone)} از {toFa(course.sessionsTotal)} جلسه
            {remaining > 0 ? ` · ${toFa(remaining)} باقی‌مانده` : ""}
          </p>
        </div>
        <Progress value={progressPct} className="mb-4" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {sessions.map((session) => {
            const done = session.number <= course.sessionsDone;
            const next = session.number === course.sessionsDone + 1;
            const hasDate =
              Boolean(session.dateLabel) && session.dateLabel !== "—";
            return (
              <div
                key={session.id}
                className={cn(
                  "flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 text-center",
                  done && "bg-success text-white",
                  next && "bg-brand text-white",
                  !done && !next && "bg-muted text-muted-foreground",
                )}
              >
                {done ? (
                  <CheckCircle2 className="size-4" />
                ) : next ? (
                  <span className="font-sans text-sm font-bold tabular-nums">
                    {toFa(session.number)}
                  </span>
                ) : (
                  <Lock className="size-3.5 opacity-60" />
                )}
                <span className="text-[10px] font-medium leading-tight opacity-90">
                  جلسه {toFa(session.number)}
                </span>
                {hasDate ? (
                  <span
                    className={cn(
                      "font-sans text-[10px] tabular-nums",
                      done || next ? "text-white/85" : "text-muted-foreground",
                    )}
                  >
                    {toFa(session.dateLabel!)}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          تاریخ هر جلسه از پنل ادمین (جلسات دوره) تنظیم می‌شود.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-bold">زمان‌بندی</h3>
        {windowLessons.map((lesson) => {
          const badge = statusBadge[lesson.status];
          return (
            <article key={lesson.id} className="surface-panel p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold text-navy">{lesson.title}</h4>
                <Badge variant={badge.variant}>
                  {badge.label || scheduleLessonLabel(lesson.status)}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  {lesson.day} · {lesson.dateLabel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-3.5" />
                  {lesson.time}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {lesson.room}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="size-3.5" />
                  {lesson.teacher}
                </span>
              </div>
              {lesson.note ? (
                <p className="mt-2 text-xs text-muted-foreground">{lesson.note}</p>
              ) : null}
            </article>
          );
        })}
      </section>

      <Link
        href={routes.courseSessions(course.id)}
        className="inline-flex text-xs font-semibold text-brand"
      >
        رفتن به جلسات این دوره
      </Link>
    </div>
  );
}

export function SchedulePage({ courseId }: { courseId?: string } = {}) {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-3xl" />}>
      <ScheduleContent courseId={courseId} />
    </Suspense>
  );
}
