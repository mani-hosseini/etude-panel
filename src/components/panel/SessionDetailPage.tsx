"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Maximize2,
  Presentation,
  UserRound,
} from "lucide-react";

import { PageHeader } from "@/components/panel/PageHeader";
import { SlideDeck } from "@/components/slides/SlideDeck";
import { courseSessions, masterclass } from "@/lib/mock-data";
import { TOTAL_SLIDES } from "@/lib/session-1-slides";

export function SessionDetailPage({ sessionId }: { sessionId: string }) {
  const reduceMotion = useReducedMotion();
  const session = courseSessions.find((s) => s.id === sessionId);

  if (!session) notFound();

  if (session.status !== "available") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={`جلسه ${session.number}`}
          title={session.title || `جلسه ${session.number}`}
          description="محتوای این جلسه هنوز فعال نشده است."
        />
        <div className="surface-panel px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            این جلسه پس از برگزاری کلاس در پنل قرار می‌گیرد.
          </p>
          <Link
            href="/dashboard/sessions"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand"
          >
            <ArrowRight className="size-4" />
            بازگشت به جلسات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard/sessions"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand"
          >
            <ArrowRight className="size-3.5" />
            همه جلسات
          </Link>
          <PageHeader
            eyebrow={`${masterclass.title} · جلسه ${session.number}`}
            title={session.title}
            description={session.summary}
          />
        </div>
        <Link
          href={`/dashboard/sessions/${session.id}/play`}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-navy px-4 py-3 text-sm font-semibold text-white shadow-lift transition hover:bg-navy-soft"
        >
          <Maximize2 className="size-4" />
          پخش تمام‌صفحه
        </Link>
      </div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-3 sm:grid-cols-3"
      >
        {[
          {
            label: "مدرس",
            value: masterclass.teacherShort,
            icon: UserRound,
          },
          {
            label: "تعداد اسلاید",
            value: String(TOTAL_SLIDES),
            icon: Presentation,
          },
          {
            label: "زمان کلاس",
            value: masterclass.timeShort,
            icon: Maximize2,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="surface-panel flex items-center gap-3 p-4"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand">
                <Icon className="size-4" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-semibold text-navy">{item.value}</p>
              </div>
            </div>
          );
        })}
      </motion.div>

      <div className="overflow-hidden rounded-3xl border border-border shadow-soft">
        <SlideDeck mode="embedded" />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        با کلیدهای جهت‌نما، اسکرول یا سوایپ بین اسلایدها جابه‌جا شوید.
      </p>
    </div>
  );
}
