"use client";

import Link from "next/link";
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
import { Progress } from "@/components/ui/progress";
import {
  courseSessions,
  masterclass,
  schedule,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const statusBadge = {
  done: {
    label: "برگزار شده",
    className: "bg-success-soft text-success",
  },
  next: {
    label: "جلسهٔ بعدی",
    className: "bg-brand-50 text-brand-700",
  },
  planned: {
    label: "برنامهٔ آینده",
    className: "bg-muted text-muted-foreground",
  },
} as const;

export function SchedulePage() {
  const reduceMotion = useReducedMotion();
  const progressPct = masterclass.progress;
  const remaining =
    masterclass.sessionsTotal - masterclass.sessionsDone;
  const nextLesson = schedule.find((l) => l.status === "next") ?? schedule[1];
  const doneLesson = schedule.find((l) => l.status === "done");

  return (
    <div className="space-y-6 pb-4 sm:space-y-8">
      <PageHeader
        eyebrow="مسترکلاس تئوری موسیقی"
        title="برنامه کلاس"
        description="کلاس فقط پنجشنبه‌ها از ساعت ۱۱ تا ۱۳ برگزار می‌شود."
      />

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="brand-gradient relative overflow-hidden rounded-3xl p-5 text-white shadow-lift sm:p-7"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -left-8 top-0 h-36 w-36 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1.5 piano-stripe opacity-80"
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs text-white/70">
              <CalendarDays className="size-3.5" strokeWidth={1.75} />
              برنامهٔ ثابت هفتگی
            </p>
            <h3 className="mt-2 text-xl font-bold sm:text-2xl">
              هر پنجشنبه · {masterclass.time}
            </h3>
            <p className="mt-1 text-sm text-white/80">
              {masterclass.teacher} · {masterclass.room}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "روز", value: "پنجشنبه" },
              { label: "ساعت", value: masterclass.timeShort },
              { label: "مدت", value: masterclass.duration },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur-sm"
              >
                <p className="text-[11px] text-white/65">{item.label}</p>
                <p className="mt-1 text-sm font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <section className="surface-panel p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-bold">پیشرفت جلسات</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {masterclass.sessionsDone} از {masterclass.sessionsTotal} جلسه
              برگزار شده · {remaining} جلسه باقی‌مانده
            </p>
          </div>
          <p className="text-2xl font-bold text-brand">{progressPct}٪</p>
        </div>
        <Progress value={progressPct} className="h-3" />
        <div className="mt-4 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
          {courseSessions.map((session) => {
            const done = session.number <= masterclass.sessionsDone;
            const next = session.number === masterclass.sessionsDone + 1;
            return (
              <div
                key={session.id}
                title={`جلسه ${session.number}`}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-lg text-[10px] font-bold sm:text-[11px]",
                  done && "bg-brand text-white",
                  next && "bg-brand-100 text-brand-700 ring-1 ring-brand-300",
                  !done && !next && "bg-muted text-muted-foreground",
                )}
              >
                {session.number}
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-3">
          <h3 className="px-1 text-base font-bold">زمان‌بندی جلسات</h3>
          {schedule.map((lesson, index) => {
            const badge =
              statusBadge[lesson.status ?? "planned"] ?? statusBadge.planned;
            return (
              <motion.article
                key={lesson.id}
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.04 }}
                className="surface-panel overflow-hidden"
              >
                <div className="grid sm:grid-cols-[7px_1fr]">
                  <div
                    className={cn(
                      "hidden sm:block",
                      lesson.status === "done" ? "bg-success" : "bg-brand",
                    )}
                  />
                  <div className="grid gap-4 p-4 sm:grid-cols-[140px_1fr] sm:p-5">
                    <div className="rounded-2xl bg-navy px-4 py-3 text-white">
                      <p className="text-[11px] text-white/65">{lesson.day}</p>
                      <p className="mt-1 text-base font-bold">
                        {lesson.dateLabel}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-white/80">
                        {lesson.time}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold">{lesson.title}</h4>
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                            badge.className,
                          )}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="size-3.5" strokeWidth={1.75} />
                          {lesson.teacher}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="size-3.5" strokeWidth={1.75} />
                          {lesson.room}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="size-3.5" strokeWidth={1.75} />
                          {lesson.duration}
                        </span>
                      </div>
                      {lesson.note ? (
                        <p className="mt-3 text-xs leading-6 text-muted-foreground">
                          {lesson.note}
                        </p>
                      ) : null}
                      {lesson.status === "done" ? (
                        <Link
                          href="/dashboard/sessions/1"
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand"
                        >
                          <Presentation className="size-3.5" />
                          مشاهده اسلایدهای جلسه
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}

          <div className="surface-panel border-dashed px-5 py-4 text-sm text-muted-foreground">
            جلسات ۳ تا ۱۰ هم در همین ساعت پنجشنبه برگزار می‌شوند و پس از هر
            کلاس، محتوایش در بخش جلسات باز می‌شود.
          </div>
        </section>

        <div className="space-y-4">
          <section className="surface-panel p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand">
                <CalendarDays className="size-4" strokeWidth={1.75} />
              </span>
              <div>
                <h3 className="text-sm font-bold">جلسهٔ بعدی</h3>
                <p className="text-xs text-muted-foreground">
                  یادآوری برنامهٔ ثابت
                </p>
              </div>
            </div>
            <p className="text-base font-semibold text-navy">
              {nextLesson?.title ?? "جلسهٔ دوم"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              پنجشنبه · {masterclass.time}
            </p>
            {doneLesson ? (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-success-soft px-3 py-2 text-xs text-success">
                <CheckCircle2 className="size-3.5" />
                آخرین جلسه: {doneLesson.dateLabel}
              </p>
            ) : null}
          </section>

          <section className="surface-panel relative overflow-hidden p-5">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-1 piano-stripe opacity-70"
            />
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-warning-soft text-warning">
                <Award className="size-4" strokeWidth={1.75} />
              </span>
              <div>
                <h3 className="text-sm font-bold">مدرک مسترکلاس</h3>
                <p className="text-xs text-muted-foreground">
                  پس از اتمام ۱۰ جلسه
                </p>
              </div>
            </div>
            <p className="text-xs leading-6 text-muted-foreground">
              با تکمیل همهٔ جلسات مسترکلاس، مدرک پایان دوره از همین بخش قابل
              دریافت خواهد بود.
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>شرایط دریافت</span>
                <span>
                  {masterclass.sessionsDone}/{masterclass.sessionsTotal}
                </span>
              </div>
              <Progress value={progressPct} className="h-2" />
            </div>
            <button
              type="button"
              disabled={!masterclass.certificateReady}
              className={cn(
                "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                masterclass.certificateReady
                  ? "bg-brand text-white hover:bg-brand-600"
                  : "cursor-not-allowed bg-muted text-muted-foreground",
              )}
            >
              {masterclass.certificateReady ? (
                <>
                  <Award className="size-4" />
                  دریافت مدرک
                </>
              ) : (
                <>
                  <Lock className="size-4" />
                  هنوز فعال نشده
                </>
              )}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
