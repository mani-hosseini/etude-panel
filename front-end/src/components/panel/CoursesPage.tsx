"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  CalendarClock,
  Clock3,
  Filter,
  Music2,
  Piano,
  Sparkles,
  UserRound,
} from "lucide-react";

import { PageHeader } from "@/components/panel/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/constants/copy";
import type { CourseStatus } from "@/lib/api/types";
import {
  queryErrorMessage,
  useCoursesQuery,
} from "@/lib/api/queries";
import { cleanCourseTitle, toFa } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const statusMeta: Record<
  CourseStatus,
  { label: string; variant: "success" | "warning" | "secondary" }
> = {
  active: { label: "فعال", variant: "success" },
  upcoming: { label: "به‌زودی", variant: "warning" },
  completed: { label: "تمام‌شده", variant: "secondary" },
};

const filters = [
  { id: "all", label: "همه" },
  { id: "active", label: "فعال" },
  { id: "upcoming", label: "به‌زودی" },
] as const;

export function CoursesPage() {
  const reduceMotion = useReducedMotion();
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const query = useCoursesQuery();

  const courses = query.data?.courses ?? [];

  const filtered = useMemo(() => {
    if (filter === "all") return courses;
    return courses.filter((c) => c.status === filter);
  }, [filter, courses]);

  const activeCount = courses.filter((c) => c.status === "active").length;
  const avgProgress = Math.round(
    courses
      .filter((c) => c.status === "active")
      .reduce((sum, c) => sum + c.progress, 0) / Math.max(activeCount, 1),
  );

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

  return (
    <div className="space-y-6 pb-4 sm:space-y-8">
      <PageHeader
        eyebrow={copy.academyName}
        title="دوره‌های من"
        description="همه دوره‌های ثبت‌شده شما — پیشرفت، مدرس و زمان هر کلاس."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "دوره‌های ثبت‌شده",
            value: String(courses.length),
            icon: Music2,
          },
          {
            label: "کلاس‌های فعال",
            value: String(activeCount),
            icon: Sparkles,
          },
          {
            label: "میانگین پیشرفت",
            value: `${avgProgress}٪`,
            icon: Piano,
          },
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              className="surface-panel flex items-center gap-3 p-4"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand">
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-0.5 font-sans text-xl font-bold tabular-nums text-navy">
                  {toFa(item.value)}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="size-3.5" />
          فیلتر
        </span>
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              filter === item.id
                ? "bg-brand text-white"
                : "bg-muted text-muted-foreground hover:bg-brand-50 hover:text-brand",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {filtered.map((course, index) => {
          const meta = statusMeta[course.status];
          return (
            <motion.article
              key={course.id}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.04 }}
              className="surface-panel p-5 sm:p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-navy">
                      {cleanCourseTitle(course.title)}
                    </h3>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-brand">
                      خلاصه سرفصل‌ها
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {course.subtitle || course.focus}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <UserRound className="size-3.5" />
                      {course.teacher}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="size-3.5" />
                      {course.nextLesson}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="size-3.5" />
                      {toFa(course.weeklyHours)} ساعت/هفته
                    </span>
                    {course.instrument || course.level ? (
                      <span className="rounded-md bg-brand-50 px-2 py-0.5 text-brand-700">
                        {[course.instrument, course.level]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="w-full shrink-0 lg:w-56">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">پیشرفت دوره</span>
                    <span className="font-sans font-bold tabular-nums text-brand">
                      {toFa(course.progress)}٪
                    </span>
                  </div>
                  <Progress value={course.progress} />
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {toFa(course.sessionsDone)} از {toFa(course.sessionsTotal)}{" "}
                    جلسه
                  </p>
                  <Link
                    href={routes.courseSessions(course.id)}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand"
                  >
                    مشاهده جلسات
                    <ArrowLeft className="size-3.5" />
                  </Link>
                </div>
              </div>
            </motion.article>
          );
        })}
        {filtered.length === 0 ? (
          <div className="surface-panel px-6 py-12 text-center text-sm text-muted-foreground">
            دوره‌ای با این فیلتر پیدا نشد.
          </div>
        ) : null}
      </div>
    </div>
  );
}
