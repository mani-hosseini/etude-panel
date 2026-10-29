"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, CalendarClock, Presentation } from "lucide-react";

import { LevelJourney } from "@/components/panel/LevelJourney";
import {
  AssignmentBarChart,
  PracticeAreaChart,
} from "@/components/panel/ProgressCharts";
import { StatCard } from "@/components/panel/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { copy } from "@/constants/copy";
import {
  queryErrorMessage,
  useDashboardQuery,
} from "@/lib/api/queries";
import { resolveAvatarUrl } from "@/lib/avatar";
import { toFa, cleanCourseTitle } from "@/lib/format";
import { parseStudentLevel } from "@/lib/student-level";
import { useStudentSession } from "@/hooks/useStudentSession";
import { routes } from "@/lib/routes";
import { isSessionOpen } from "@/lib/session-access";

export function DashboardHome() {
  const reduceMotion = useReducedMotion();
  const session = useStudentSession();
  const query = useDashboardQuery();

  if (query.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
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
  const level = parseStudentLevel(data.student.level);

  return (
    <div className="space-y-6">
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
      >
        <div className="flex items-center gap-3.5">
          <div className="size-12 overflow-hidden rounded-full border border-border bg-muted sm:size-14">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveAvatarUrl(data.student.avatarUrl)}
              alt={session.displayName}
              className="size-full object-cover"
            />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-navy sm:text-xl">
              {session.displayName} عزیز، خوش آمدید
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              سطح {toFa(level)}
              {data.primaryCourse
                ? ` · ${cleanCourseTitle(data.primaryCourse.title)}`
                : " · هنرجوی آکادمی اتود"}
            </p>
            <div className="mt-2">
              <StarRating value={data.student.stars ?? 0} readOnly />
            </div>
          </div>
        </div>
        {nextLesson ? (
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarClock className="size-3.5" strokeWidth={1.75} />
              {copy.dashboard.nextLesson}
            </p>
            <p className="mt-1 font-medium text-navy">{nextLesson.title}</p>
            {nextLesson.dateLabel &&
            nextLesson.dateLabel !== "—" &&
            nextLesson.dateLabel !== "قفل" ? (
              <p className="text-xs text-muted-foreground">
                {toFa(nextLesson.dateLabel)}
              </p>
            ) : null}
          </div>
        ) : null}
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

      <section className="grid gap-4 xl:grid-cols-2 xl:items-stretch">
        <PracticeAreaChart />
        <AssignmentBarChart />
      </section>

      <Card className="shadow-none">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">{copy.dashboard.pathTitle}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {copy.dashboard.pathHint}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={routes.path}>
                مسیر کامل
                <ArrowLeft className="size-3.5" />
              </Link>
            </Button>
          </div>
          <LevelJourney level={level} />
        </CardContent>
      </Card>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">{copy.dashboard.myCourses}</h3>
          <Link
            href={routes.courses}
            className="text-xs font-medium text-muted-foreground hover:text-navy"
          >
            {copy.dashboard.seeAll}
          </Link>
        </div>

        <div className="space-y-3">
          {data.courses.slice(0, 3).map((course) => (
            <div key={course.id} className="rounded-xl border border-border/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-medium">
                      {cleanCourseTitle(course.title)}
                    </h4>
                    <Badge variant="secondary">
                      {course.status === "active"
                        ? "فعال"
                        : course.status === "upcoming"
                          ? "به‌زودی"
                          : "تمام‌شده"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {course.teacher}
                  </p>
                </div>
                <span className="shrink-0 font-sans text-sm tabular-nums text-navy">
                  {toFa(course.progress)}٪
                </span>
              </div>
              <Progress value={course.progress} className="mt-3" />
            </div>
          ))}
        </div>

        {currentSession && data.primaryCourse ? (
          <Link
            href={
              isSessionOpen(currentSession)
                ? routes.courseSession(
                    data.primaryCourse.id,
                    currentSession.id,
                  )
                : routes.courseSessions(data.primaryCourse.id)
            }
            className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 transition hover:bg-muted/40"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-navy text-white">
                <Presentation className="size-4" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-sm font-medium text-navy">
                  جلسه {toFa(currentSession.number)} · {currentSession.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {toFa(data.slideCount)} اسلاید
                </p>
              </div>
            </div>
            <ArrowLeft className="size-4 text-muted-foreground" />
          </Link>
        ) : null}
      </section>
    </div>
  );
}
