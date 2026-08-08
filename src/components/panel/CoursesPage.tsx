"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  CalendarClock,
  Clock3,
  Filter,
  Music2,
  Piano,
  Sparkles,
  UserRound,
} from "lucide-react";

import { PageHeader } from "@/components/panel/PageHeader";
import { Progress } from "@/components/ui/progress";
import { courses, type CourseStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const statusMeta: Record<
  CourseStatus,
  { label: string; className: string }
> = {
  active: {
    label: "فعال",
    className: "bg-success-soft text-success",
  },
  upcoming: {
    label: "به‌زودی",
    className: "bg-warning-soft text-warning",
  },
  completed: {
    label: "تمام‌شده",
    className: "bg-muted text-muted-foreground",
  },
};

const filters = [
  { id: "all", label: "همه" },
  { id: "active", label: "فعال" },
  { id: "upcoming", label: "به‌زودی" },
] as const;

export function CoursesPage() {
  const reduceMotion = useReducedMotion();
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return courses;
    return courses.filter((c) => c.status === filter);
  }, [filter]);

  const activeCount = courses.filter((c) => c.status === "active").length;
  const avgProgress = Math.round(
    courses
      .filter((c) => c.status === "active")
      .reduce((sum, c) => sum + c.progress, 0) / Math.max(activeCount, 1),
  );

  return (
    <div className="space-y-6 pb-4 sm:space-y-8">
      <PageHeader
        eyebrow="آموزشگاه موسیقی اتود"
        title="دوره‌های من"
        description="مسیر یادگیری، پیشرفت جلسات و تمرکز فعلی هر کلاس را در یک نگاه ببینید."
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
                <p className="mt-0.5 text-xl font-bold text-navy">{item.value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="size-3.5" strokeWidth={1.75} />
          فیلتر وضعیت
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                filter === item.id
                  ? "bg-brand text-white shadow-lift"
                  : "bg-white text-muted-foreground ring-1 ring-border hover:bg-brand-50 hover:text-brand",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        {filtered.map((course, index) => {
          const meta = statusMeta[course.status];
          return (
            <motion.article
              key={course.id}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.04 }}
              className="surface-panel group relative overflow-hidden p-5 sm:p-6"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-1 piano-stripe opacity-70"
              />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-navy/5 px-2 py-0.5 text-[11px] font-medium text-navy">
                      {course.instrument}
                    </span>
                    <span
                      className={cn(
                        "rounded-lg px-2 py-0.5 text-[11px] font-semibold",
                        meta.className,
                      )}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-foreground transition-colors group-hover:text-brand">
                    {course.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    سطح {course.level}
                  </p>
                </div>
                <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-50 text-brand">
                  <span className="text-sm font-bold leading-none">
                    {course.progress}٪
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>پیشرفت دوره</span>
                  <span>
                    {course.sessionsDone} از {course.sessionsTotal} جلسه
                  </span>
                </div>
                <Progress value={course.progress} className="h-2.5" />
              </div>

              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-2xl bg-muted/70 px-3 py-2.5">
                  <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <UserRound className="size-3.5" strokeWidth={1.75} />
                    استاد
                  </p>
                  <p className="mt-1 text-sm font-medium">{course.teacher}</p>
                </div>
                <div className="rounded-2xl bg-muted/70 px-3 py-2.5">
                  <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <CalendarClock className="size-3.5" strokeWidth={1.75} />
                    جلسه بعدی
                  </p>
                  <p className="mt-1 text-sm font-medium">{course.nextLesson}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-brand-100 bg-brand-50/60 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-brand-700">
                    تمرکز فعلی
                  </p>
                  <p className="mt-0.5 truncate text-sm text-navy">
                    {course.focus}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
                  <Clock3 className="size-3.5" strokeWidth={1.75} />
                  {course.weeklyHours} ساعت / هفته
                </span>
              </div>
            </motion.article>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="surface-panel px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            دوره‌ای با این فیلتر پیدا نشد.
          </p>
        </div>
      ) : null}
    </div>
  );
}
