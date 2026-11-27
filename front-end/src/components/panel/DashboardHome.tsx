"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, CalendarClock, Presentation } from "lucide-react";

import { LevelJourney } from "@/components/panel/LevelJourney";
import { SupportReplyBanner } from "@/components/panel/support/SupportBell";
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
  useAssignmentsQuery,
  useDashboardQuery,
} from "@/lib/api/queries";
import { UserAvatar } from "@/components/ui/user-avatar";
import { toFa, cleanCourseTitle } from "@/lib/format";
import {
  assignmentsRegisteredPhrase,
  classDateLabel,
  visibleAssignmentDate,
} from "@/lib/jalali";
import { parseStudentLevel } from "@/lib/student-level";
import { useStudentSession } from "@/hooks/useStudentSession";
import { routes } from "@/lib/routes";
import { isSessionOpen } from "@/lib/session-access";

const PracticeAreaChart = dynamic(
  () =>
    import("@/components/panel/ProgressCharts").then(
      (mod) => mod.PracticeAreaChart,
    ),
  { loading: () => <Skeleton className="h-[280px] rounded-2xl sm:h-[360px]" /> },
);

const AssignmentBarChart = dynamic(
  () =>
    import("@/components/panel/ProgressCharts").then(
      (mod) => mod.AssignmentBarChart,
    ),
  { loading: () => <Skeleton className="h-[280px] rounded-2xl sm:h-[360px]" /> },
);

export function DashboardHome() {
  const session = useStudentSession();
  const query = useDashboardQuery();
  const assignmentsQuery = useAssignmentsQuery();

  if (query.isPending) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl sm:h-72" />
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
    <div className="space-y-4 sm:space-y-6">
      <SupportReplyBanner />
      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
          <UserAvatar
            avatarUrl={data.student.avatarUrl}
            alt={session.displayName}
            className="size-11 shrink-0 sm:size-14"
          />
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold tracking-tight text-navy sm:text-xl">
              {session.displayName} عزیز، خوش آمدید
            </h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground sm:mt-1 sm:text-sm">
              سطح {toFa(level)}
              {data.primaryCourse
                ? ` · ${cleanCourseTitle(data.primaryCourse.title)}`
                : " · هنرجوی آکادمی اتود"}
            </p>
            <div className="mt-1.5 sm:mt-2">
              <StarRating value={data.student.stars ?? 0} readOnly />
            </div>
          </div>
        </div>
        {nextLesson ? (
          <div className="w-full shrink-0 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm sm:w-auto sm:max-w-[16rem] sm:px-4 sm:py-3">
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarClock className="size-3.5 shrink-0" strokeWidth={1.75} />
              {copy.dashboard.nextLesson}
            </p>
            <p className="mt-1 truncate font-medium text-navy">
              {nextLesson.title}
            </p>
            {nextLesson.dateLabel &&
            nextLesson.dateLabel !== "—" &&
            nextLesson.dateLabel !== "قفل" ? (
              <p className="text-xs text-muted-foreground">
                {toFa(nextLesson.dateLabel)}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rise-list grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
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

      <section className="grid gap-3 sm:gap-4 xl:grid-cols-2 xl:items-stretch">
        <PracticeAreaChart />
        <AssignmentBarChart />
      </section>

      <Card className="shadow-none">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">{copy.dashboard.pathTitle}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {copy.dashboard.pathHint}
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link href={routes.path}>
                مسیر کامل
                <ArrowLeft className="size-3.5" />
              </Link>
            </Button>
          </div>
          <LevelJourney level={level} />
        </CardContent>
      </Card>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
          <h3 className="text-sm font-semibold">{copy.dashboard.myCourses}</h3>
          <Link
            href={routes.courses}
            className="text-xs font-medium text-muted-foreground hover:text-navy"
          >
            {copy.dashboard.seeAll}
          </Link>
        </div>

        <div className="space-y-2.5 sm:space-y-3">
          {data.courses.slice(0, 3).map((course) => (
            <div
              key={course.id}
              className="rounded-xl border border-border/80 p-3.5 sm:p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate text-sm font-medium">
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
                  <p className="mt-1 truncate text-xs text-muted-foreground">
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
            className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3 transition hover:bg-muted/40 sm:mt-4 sm:px-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-navy text-white">
                <Presentation className="size-4" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-navy">
                  {assignmentsRegisteredPhrase(currentSession.registeredOn) ||
                    assignmentsRegisteredPhrase(
                      visibleAssignmentDate(
                        (assignmentsQuery.data ?? []).filter(
                          (item) =>
                            item.sessionId === currentSession.uuid ||
                            item.sessionId === currentSession.id ||
                            item.sessionNumber === currentSession.number,
                        ),
                      ),
                    ) ||
                    currentSession.sessionDate ||
                    classDateLabel(currentSession.heldOn)}
                  {currentSession.title ? ` · ${currentSession.title}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {toFa(data.slideCount)} اسلاید
                </p>
              </div>
            </div>
            <ArrowLeft className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        ) : null}
      </section>
    </div>
  );
}
