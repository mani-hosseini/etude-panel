"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  CalendarClock,
  Lock,
  Presentation,
} from "lucide-react";

import { PageHeader } from "@/components/panel/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { SessionStatus } from "@/lib/api/types";
import {
  queryErrorMessage,
  useSessionsQuery,
} from "@/lib/api/queries";
import { toFa, weekdayPlural, cleanCourseTitle } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const statusMeta: Record<
  SessionStatus,
  { label: string; variant: "success" | "warning" | "secondary" }
> = {
  available: { label: "آماده مشاهده", variant: "success" },
  upcoming: { label: "به‌زودی", variant: "warning" },
  locked: { label: "قفل", variant: "secondary" },
};

export function SessionsPage({ courseId }: { courseId?: string } = {}) {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryCourseId = searchParams.get("courseId");

  useEffect(() => {
    if (!courseId && queryCourseId) {
      router.replace(routes.courseSessions(queryCourseId));
    }
  }, [courseId, queryCourseId, router]);

  const resolvedCourseId = courseId ?? queryCourseId ?? undefined;
  const query = useSessionsQuery(resolvedCourseId);

  useEffect(() => {
    if (courseId || queryCourseId) return;
    if (!query.isSuccess) return;
    router.replace(routes.courseSessions(query.data.course.id));
  }, [courseId, queryCourseId, query.isSuccess, query.data, router]);

  if (!courseId && (queryCourseId || query.isSuccess)) {
    return <Skeleton className="h-64 rounded-3xl" />;
  }

  if (query.isPending) {
    return (
      <div className="space-y-6 pb-4">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-40 rounded-3xl" />
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

  const { course, sessions } = query.data;
  const available = sessions.filter((s) => s.status === "available").length;

  return (
    <div className="space-y-6 pb-4 sm:space-y-8">
      <PageHeader
        eyebrow={course.teacher}
        title={`جلسات · ${course.title}`}
        description="محتوای هر جلسه به‌صورت اسلاید در دسترس است."
      />

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="brand-gradient relative overflow-hidden rounded-3xl p-5 text-white shadow-lift sm:p-7"
      >
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs text-white/70">{course.subtitle}</p>
            <h3 className="mt-1 text-xl font-bold sm:text-2xl">
              {cleanCourseTitle(course.title)}
            </h3>
            <p className="mt-2 text-sm text-white/80">
              {weekdayPlural(course.day)} · {course.time} · {course.room}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "جلسات", value: String(course.sessionsTotal) },
              { label: "آزاد", value: String(available) },
              { label: "پیشرفت", value: `${course.progress}٪` },
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

      <div className="grid gap-4">
        {sessions.map((session, index) => {
          const completed =
            session.status === "available" &&
            (session.progressPercent ?? 0) >= 100;
          const meta = completed
            ? { label: "مشاهده شد", variant: "success" as const }
            : statusMeta[session.status];
          const clickable = session.status === "available";
          const href = routes.courseSession(course.id, session.id);

          const card = (
            <motion.article
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.04 }}
              className={cn(
                "surface-panel group relative overflow-hidden p-5 sm:p-6",
                clickable && "transition-colors hover:border-brand-200",
                !clickable && "opacity-90",
              )}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-navy px-2.5 py-1 font-sans text-[11px] font-bold tabular-nums text-white">
                      جلسه {toFa(session.number)}
                    </span>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-foreground group-hover:text-brand">
                    {session.title || `جلسه ${toFa(session.number)}`}
                  </h3>
                  <p className="mt-1.5 text-sm leading-7 text-muted-foreground">
                    {session.summary}
                  </p>
                  {session.topics.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {session.topics.map((topic, topicIndex) => (
                        <span
                          key={`${session.id}-topic-${topicIndex}`}
                          className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {session.status === "available" && session.slideCount > 0 ? (
                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>پیشرفت اسلایدها</span>
                        <span className="font-sans tabular-nums text-brand">
                          {toFa(session.progressPercent ?? 0)}٪
                        </span>
                      </div>
                      <Progress value={session.progressPercent ?? 0} />
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground sm:justify-end">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="size-3.5" strokeWidth={1.75} />
                      {toFa(session.dateLabel)}
                      {session.timeLabel
                        ? ` · ${toFa(session.timeLabel)}`
                        : ""}
                    </span>
                    {session.slideCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Presentation className="size-3.5" strokeWidth={1.75} />
                        {toFa(session.slideCount)} اسلاید
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <Lock className="size-3.5" strokeWidth={1.75} />
                        محتوای بعدی
                      </span>
                    )}
                  </div>
                  {clickable ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
                      مشاهده محتوا
                      <ArrowLeft className="size-3.5" />
                    </span>
                  ) : null}
                </div>
              </div>
            </motion.article>
          );

          return clickable ? (
            <Link key={session.id} href={href}>
              {card}
            </Link>
          ) : (
            <div key={session.id}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
