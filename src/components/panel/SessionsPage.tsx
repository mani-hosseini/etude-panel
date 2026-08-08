"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  CalendarClock,
  Lock,
  Presentation,
} from "lucide-react";

import { PageHeader } from "@/components/panel/PageHeader";
import {
  courseSessions,
  masterclass,
  type SessionStatus,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const statusMeta: Record<
  SessionStatus,
  { label: string; className: string }
> = {
  available: {
    label: "آماده مشاهده",
    className: "bg-success-soft text-success",
  },
  upcoming: {
    label: "به‌زودی",
    className: "bg-warning-soft text-warning",
  },
  locked: {
    label: "قفل",
    className: "bg-muted text-muted-foreground",
  },
};

export function SessionsPage() {
  const reduceMotion = useReducedMotion();
  const available = courseSessions.filter((s) => s.status === "available").length;

  return (
    <div className="space-y-6 pb-4 sm:space-y-8">
      <PageHeader
        eyebrow={masterclass.teacher}
        title="جلسات مسترکلاس"
        description="محتوای هر جلسه اینجا به‌صورت اسلاید نمایش داده می‌شود."
      />

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="brand-gradient relative overflow-hidden rounded-3xl p-5 text-white shadow-lift sm:p-7"
      >
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1.5 piano-stripe opacity-80"
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs text-white/70">{masterclass.subtitle}</p>
            <h3 className="mt-1 text-xl font-bold sm:text-2xl">
              {masterclass.title}
            </h3>
            <p className="mt-2 text-sm text-white/80">
              {masterclass.day}ها · {masterclass.time} · {masterclass.room}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "جلسات", value: String(masterclass.sessionsTotal) },
              { label: "آزاد", value: String(available) },
              { label: "پیشرفت", value: `${masterclass.progress}٪` },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-white/10 px-3 py-2.5 text-center backdrop-blur-sm"
              >
                <p className="text-[11px] text-white/65">{item.label}</p>
                <p className="mt-1 text-lg font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <div className="grid gap-4">
        {courseSessions.map((session, index) => {
          const meta = statusMeta[session.status];
          const clickable = session.status === "available";

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
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-1 piano-stripe opacity-70"
              />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-navy px-2.5 py-1 text-[11px] font-bold text-white">
                      جلسه {session.number}
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
                  {session.title ? (
                    <h3 className="mt-2 text-lg font-bold text-foreground group-hover:text-brand">
                      {session.title}
                    </h3>
                  ) : (
                    <h3 className="mt-2 text-lg font-bold text-foreground group-hover:text-brand">
                      جلسه {session.number}
                    </h3>
                  )}
                  <p className="mt-1.5 text-sm leading-7 text-muted-foreground">
                    {session.summary}
                  </p>
                  {session.topics.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {session.topics.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground sm:justify-end">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="size-3.5" strokeWidth={1.75} />
                      {session.dateLabel}
                    </span>
                    {session.slideCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Presentation className="size-3.5" strokeWidth={1.75} />
                        {session.slideCount} اسلاید
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
            <Link key={session.id} href={`/dashboard/sessions/${session.id}`}>
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
