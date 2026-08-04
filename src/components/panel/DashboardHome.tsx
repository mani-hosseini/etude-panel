"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Music4,
  Sparkles,
} from "lucide-react";

import { PianoKeysBar } from "@/components/brand/PianoKeysBar";
import { Progress } from "@/components/ui/progress";
import { copy } from "@/constants/copy";
import {
  courses,
  dashboardStats,
  practiceTips,
  schedule,
  studentProfile,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const statusLabel = {
  active: "فعال",
  upcoming: "به‌زودی",
  completed: "تمام‌شده",
} as const;

const typeLabel = {
  private: "خصوصی",
  group: "گروهی",
  theory: "تئوری",
} as const;

export function DashboardHome() {
  const reduceMotion = useReducedMotion();
  const activeCourses = courses.filter((c) => c.status === "active");
  const nextLesson = schedule[0];

  return (
    <div className="space-y-8">
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl bg-brand px-6 py-7 text-white sm:px-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 bottom-0 h-36 w-36 rounded-full bg-black/10 blur-2xl"
        />
        <PianoKeysBar className="absolute inset-x-0 bottom-0 h-1.5 rounded-none opacity-80" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-white/70">{copy.dashboard.welcome}</p>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
              {studentProfile.fullName}
            </h2>
            <p className="mt-2 text-sm text-white/80">
              {studentProfile.instrument} · سطح {studentProfile.level} · کد{" "}
              {studentProfile.studentCode}
            </p>
          </div>
          <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <CalendarClock className="size-3.5" strokeWidth={1.75} />
              {copy.dashboard.nextLesson}
            </div>
            <p className="mt-1 text-base font-semibold">{nextLesson.title}</p>
            <p className="text-sm text-white/80">
              {nextLesson.day} · {nextLesson.time}
            </p>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat, index) => (
          <motion.div
            key={stat.id}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.05 }}
            className="rounded-2xl border border-border bg-white p-4"
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-brand">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
          </motion.div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl border border-border bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold">{copy.dashboard.myCourses}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                پیشرفت دوره‌های فعال شما
              </p>
            </div>
            <Link
              href="/dashboard/courses"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-600"
            >
              {copy.dashboard.seeAll}
              <ArrowLeft className="size-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {activeCourses.map((course) => (
              <div
                key={course.id}
                className="rounded-2xl border border-border/80 bg-background/60 p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-foreground">
                        {course.title}
                      </h4>
                      <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                        {statusLabel[course.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {course.teacher} · {course.level} · جلسه بعدی{" "}
                      {course.nextLesson}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-brand">
                    {course.progress}٪
                  </span>
                </div>
                <Progress value={course.progress} className="mt-3" />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {course.sessionsDone} از {course.sessionsTotal} جلسه
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl border border-border bg-white p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">
                {copy.dashboard.weekSchedule}
              </h3>
              <Link
                href="/dashboard/schedule"
                className="text-xs font-semibold text-brand"
              >
                {copy.dashboard.seeAll}
              </Link>
            </div>
            <ul className="space-y-3">
              {schedule.slice(0, 3).map((lesson) => (
                <li
                  key={lesson.id}
                  className="flex gap-3 rounded-2xl border border-border/70 bg-background/50 p-3"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
                    <Music4 className="size-4" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {lesson.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {lesson.day} · {lesson.time}
                    </p>
                    <span
                      className={cn(
                        "mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                        "bg-brand-50 text-brand-700",
                      )}
                    >
                      {typeLabel[lesson.type]}
                    </span>
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
              {practiceTips.map((tip) => (
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
