"use client";

import { useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Lock,
  MapPin,
  Presentation,
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
import { toFa } from "@/lib/format";
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

  const { course, lessons, sessions } = query.data;
  const progressPct = course.progress;
  const remaining = course.sessionsTotal - course.sessionsDone;

  return (
    <div className="space-y-6 pb-4 sm:space-y-8">
      <PageHeader
        eyebrow="برنامه کلاس‌ها"
        title={course.title}
        description={`${course.teacher} · ${course.day}ها ${course.time}`}
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
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold">پیشرفت جلسات</h3>
          <p className="font-sans text-xs tabular-nums text-muted-foreground">
            {toFa(course.sessionsDone)} از {toFa(course.sessionsTotal)} جلسه
            {remaining > 0 ? ` · ${toFa(remaining)} باقی‌مانده` : ""}
          </p>
        </div>
        <Progress value={progressPct} className="mb-4" />
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {sessions.map((session) => {
            const done = session.number <= course.sessionsDone;
            const next = session.number === course.sessionsDone + 1;
            return (
              <div
                key={session.id}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-xl font-sans text-xs font-bold tabular-nums",
                  done && "bg-success text-white",
                  next && "bg-brand text-white",
                  !done && !next && "bg-muted text-muted-foreground",
                )}
              >
                {done ? (
                  <CheckCircle2 className="size-4" />
                ) : next ? (
                  toFa(session.number)
                ) : (
                  <Lock className="size-3.5 opacity-60" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-bold">زمان‌بندی</h3>
        {lessons.map((lesson) => {
          const badge = statusBadge[lesson.status];
          return (
            <article key={lesson.id} className="surface-panel p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold text-navy">{lesson.title}</h4>
                <Badge variant={badge.variant}>{badge.label}</Badge>
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

      <section className="surface-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand">
            <Award className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold">مدرک پایان دوره</h3>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              با تکمیل همهٔ جلسات این دوره، مدرک از همین بخش قابل دریافت است.
            </p>
            <p className="mt-1 font-sans text-xs font-semibold tabular-nums text-navy">
              {toFa(course.sessionsDone)}/{toFa(course.sessionsTotal)}
            </p>
          </div>
        </div>
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
