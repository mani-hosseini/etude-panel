"use client";

import { motion, useReducedMotion } from "motion/react";
import { Award, BadgeCheck, Music2 } from "lucide-react";

import { PianoKeysBar } from "@/components/brand/PianoKeysBar";
import { PageHeader } from "@/components/panel/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentSession } from "@/hooks/useStudentSession";
import {
  queryErrorMessage,
  useProfileQuery,
} from "@/lib/api/queries";
import { toFa } from "@/lib/format";

export function ProfilePage() {
  const reduceMotion = useReducedMotion();
  const session = useStudentSession();
  const query = useProfileQuery();
  const fullName = session.displayName;
  const firstName = session.firstName;
  const initial = firstName.charAt(0) || "ه";

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

  const { student, primaryCourse, achievements, courses } = query.data;
  const learningFields = [
    { label: "دوره فعال", value: student.programTitle },
    {
      label: "مدرس",
      value: primaryCourse?.teacher ?? "—",
    },
    { label: "سطح", value: student.level },
    {
      label: "زمان کلاس",
      value: primaryCourse
        ? `${primaryCourse.timeShort}`
        : "—",
    },
  ] as const;

  return (
    <div className="space-y-6 pb-4 sm:space-y-8">
      <PageHeader
        eyebrow="هنرجوی اتود"
        title="پروفایل هنرجو"
        description="اطلاعات شما و دوره‌های ثبت‌شده در آموزشگاه موسیقی اتود."
      />

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="brand-gradient relative overflow-hidden rounded-3xl p-5 text-white shadow-lift sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 top-0 h-44 w-44 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-8 bottom-0 h-36 w-36 rounded-full bg-black/15 blur-2xl"
        />
        <PianoKeysBar className="absolute inset-x-0 bottom-0 h-1.5 rounded-none opacity-85" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative mx-auto sm:mx-0">
              <div className="flex size-20 items-center justify-center rounded-[1.35rem] bg-white text-3xl font-bold text-brand shadow-lg sm:size-24 sm:text-4xl">
                {initial}
              </div>
              <span className="absolute -bottom-1 -left-1 inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[10px] font-semibold text-white">
                <BadgeCheck className="size-3" />
                تاییدشده
              </span>
            </div>
            <div className="text-center sm:text-right">
              <h3 className="text-2xl font-bold sm:text-3xl">{fullName}</h3>
              <p className="mt-1.5 text-sm text-white/80">
                {student.programTitle} · سطح {student.level}
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs text-white/85">
                <Music2 className="size-3.5" strokeWidth={1.75} />
                {primaryCourse?.teacher ?? `${courses.length} دوره`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: "حضور", value: student.attendanceRate },
              { label: "جلسات", value: student.totalHours },
              { label: "دوره", value: student.activeCoursesCount },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-white/10 px-3 py-3 text-center backdrop-blur-sm"
              >
                <p className="text-[11px] text-white/65">{item.label}</p>
                <p className="mt-1 font-sans text-lg font-bold tabular-nums sm:text-xl">
                  {toFa(item.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <section className="surface-panel overflow-hidden">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h3 className="text-base font-bold">مسیر یادگیری</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            وضعیت فعلی شما در دوره‌های آموزشگاه
          </p>
        </div>
        <dl className="grid sm:grid-cols-2">
          {learningFields.map((field) => (
            <div
              key={field.label}
              className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5 sm:px-6 last:border-b-0 sm:odd:border-l"
            >
              <dt className="text-xs text-muted-foreground">{field.label}</dt>
              <dd className="text-sm font-semibold text-navy">{field.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="surface-panel p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand">
            <Award className="size-4" strokeWidth={1.75} />
          </span>
          <div>
            <h3 className="text-base font-bold">دستاوردهای اخیر</h3>
            <p className="text-xs text-muted-foreground">
              نشان‌های پیشرفت در مسیر موسیقی
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {achievements.map((item, index) => (
            <motion.div
              key={item.id}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 + index * 0.05 }}
              className="rounded-2xl border border-brand-100 bg-linear-to-b from-brand-50/80 to-white p-4"
            >
              <p className="text-sm font-bold text-navy">{item.title}</p>
              <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
