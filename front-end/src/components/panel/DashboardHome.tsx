"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Presentation,
  Sparkles,
} from "lucide-react";

import { StatCard } from "@/components/panel/StatCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/constants/copy";
import {
  queryErrorMessage,
  useDashboardQuery,
} from "@/lib/api/queries";
import { resolveAvatarUrl } from "@/lib/avatar";
import { toFa, weekdayPlural, cleanCourseTitle } from "@/lib/format";
import { scheduleLessonLabel } from "@/lib/schedule-window";
import { useStudentSession } from "@/hooks/useStudentSession";
import { routes } from "@/lib/routes";

export function DashboardHome() {
  const reduceMotion = useReducedMotion();
  const session = useStudentSession();
  const query = useDashboardQuery();

  if (query.isPending) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-36 rounded-3xl" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-3xl" />
          ))}
        </div>
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

  const data = query.data;
  const nextLesson = data.nextLesson;
  const currentSession = data.currentSession;

  return (
    <div className="space-y-8">
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="brand-gradient relative overflow-hidden rounded-3xl px-6 py-7 text-white shadow-lift sm:px-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 bottom-0 h-36 w-36 rounded-full bg-black/10 blur-2xl"
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-2xl font-bold text-brand shadow-md sm:size-20 sm:text-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveAvatarUrl(data.student.avatarUrl)}
                alt={session.displayName}
                className="size-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">
                {session.displayName} عزیز خوش آمدید!
              </h2>
              <p className="mt-2 text-sm text-white/80">
                {data.primaryCourse
                  ? `${cleanCourseTitle(data.primaryCourse.title)} · ${data.primaryCourse.teacher}`
                  : "هنرجوی اتود"}
              </p>
            </div>
          </div>
          {nextLesson ? (
            <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs text-white/70">
                <CalendarClock className="size-3.5" strokeWidth={1.75} />
                {copy.dashboard.nextLesson}
              </div>
              <p className="mt-1 text-base font-semibold">{nextLesson.title}</p>
              <p className="text-sm text-white/80">
                {nextLesson.day} · {nextLesson.time}
                {nextLesson.dateLabel &&
                nextLesson.dateLabel !== "—" &&
                nextLesson.dateLabel !== "قفل"
                  ? ` · ${toFa(nextLesson.dateLabel)}`
                  : ""}
              </p>
            </div>
          ) : null}
        </div>
      </motion.section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.stats.map((stat, index) => (
          <StatCard
            key={stat.id}
            label={stat.label}
            value={stat.value}
            hint={stat.hint}
            index={index}
          />
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="surface-panel p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold">{copy.dashboard.myCourses}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                همه دوره‌های ثبت‌شده شما در {copy.academyName}
              </p>
            </div>
            <Link
              href={routes.courses}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-600"
            >
              {copy.dashboard.seeAll}
              <ArrowLeft className="size-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {data.courses.slice(0, 3).map((course) => (
              <div
                key={course.id}
                className="rounded-2xl border border-border/80 bg-background/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-foreground">
                        {cleanCourseTitle(course.title)}
                      </h4>
                      <Badge
                        variant={
                          course.status === "active"
                            ? "success"
                            : course.status === "upcoming"
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {course.status === "active"
                          ? "فعال"
                          : course.status === "upcoming"
                            ? "به‌زودی"
                            : "تمام‌شده"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {course.teacher} · {weekdayPlural(course.day)}{" "}
                      {course.timeShort}
                    </p>
                  </div>
                  <span className="shrink-0 font-sans text-sm font-bold tabular-nums text-brand">
                    {toFa(course.progress)}٪
                  </span>
                </div>
                <Progress value={course.progress} className="mt-3" />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  تمرکز: {course.focus}
                </p>
              </div>
            ))}
          </div>

          {currentSession && data.primaryCourse ? (
            <Link
              href={routes.courseSession(
                data.primaryCourse.id,
                currentSession.id,
              )}
              className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-brand-50/70 px-4 py-3 transition hover:bg-brand-50"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-white">
                  <Presentation className="size-4" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-navy">
                    جلسه {toFa(currentSession.number)} · {currentSession.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {toFa(data.slideCount)} اسلاید آماده مشاهده
                  </p>
                </div>
              </div>
              <ArrowLeft className="size-4 text-brand" />
            </Link>
          ) : null}
        </section>

        <div className="space-y-6">
          <section className="surface-panel p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">
                {copy.dashboard.weekSchedule}
              </h3>
              <Link
                href={routes.schedule}
                className="text-xs font-semibold text-brand"
              >
                {copy.dashboard.seeAll}
              </Link>
            </div>
            <ul className="space-y-3">
              {data.schedulePreview.map((lesson) => (
                <li
                  key={lesson.id}
                  className="flex gap-3 rounded-2xl border border-border/70 bg-background/50 p-3"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
                    <CalendarClock className="size-4" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {lesson.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {lesson.day} · {lesson.time}
                      {lesson.dateLabel && lesson.dateLabel !== "—"
                        ? ` · ${toFa(lesson.dateLabel)}`
                        : ""}
                    </p>
                    <Badge
                      className="mt-1"
                      variant={
                        lesson.status === "done"
                          ? "success"
                          : lesson.status === "next"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {scheduleLessonLabel(lesson.status)}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/50 p-5">
            <div className="mb-3 flex items-center gap-2 text-brand-700">
              <Sparkles className="size-4" strokeWidth={1.75} />
              <h3 className="text-sm font-bold">{copy.dashboard.practice}</h3>
            </div>
            <ul className="space-y-2.5">
              {data.practiceTips.map((tip) => (
                <li
                  key={tip}
                  className="flex items-start gap-2 text-xs leading-6 text-brand-800"
                >
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
