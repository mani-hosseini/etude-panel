"use client";

import Link from "next/link";
import { ArrowLeft, Clock3, MapPin, Music2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { audienceError } from "@/lib/api/errors";
import { useStudioTodayQuery } from "@/lib/api/studio-queries";
import { toFa } from "@/lib/format";
import { teacherRoutes } from "@/lib/routes";
import { studentDisplayName } from "@/lib/teacher-studio";

type RollStudent = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  level: number;
  piece: string;
  avatarUrl?: string | null;
  sessionId: string | null;
  sessionNumber: number | null;
  nextHomework: Array<{ category: string; title: string }>;
};

function dossierHref(student: RollStudent) {
  const path = teacherRoutes.student(
    student.id,
    student.sessionId ?? undefined,
  );
  return path.includes("?") ? `${path}&from=class` : `${path}?from=class`;
}

export function TeacherTodayClass() {
  const todayQuery = useStudioTodayQuery();

  if (todayQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 rounded-3xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  if (todayQuery.isError || !todayQuery.data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {audienceError(todayQuery.error, "رول امروز در دسترس نیست.")}
      </div>
    );
  }

  const today = todayQuery.data;
  const slots = (today.classes ?? []).filter((item) => item.students.length > 0);
  const weekday = today.today ?? "";

  if (slots.length === 0) {
    return (
      <section className="overflow-hidden rounded-[28px] border border-border/80 bg-card shadow-soft">
        <header className="navy-gradient px-5 py-7 text-white sm:px-8">
          <p className="text-[11px] font-medium tracking-[0.18em] text-brand-300">
            رول کلاس امروز
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold">{weekday}</h1>
          <p className="mt-2 text-sm text-white/65">امروز جلسه‌ای در برنامه نیست.</p>
        </header>
        <div className="px-5 py-10 text-center sm:px-8">
          {today.nextClass ? (
            <p className="text-sm text-muted-foreground">
              نزدیک‌ترین کلاس: {today.nextClass.title} · {today.nextClass.day} ·{" "}
              {toFa(today.nextClass.start)}
              {today.nextClass.end ? ` تا ${toFa(today.nextClass.end)}` : ""}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              وقتی دوره به این استاد واگذار شود، رول اینجا دیده می‌شود.
            </p>
          )}
          <Link
            href={teacherRoutes.students}
            className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-600"
          >
            پرونده هنرجویان
            <ArrowLeft className="size-4" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {slots.map((slot) => (
        <section
          key={slot.id}
          className="overflow-hidden rounded-[28px] border border-border/80 bg-card shadow-soft"
        >
          <header className="relative overflow-hidden navy-gradient px-5 py-6 text-white sm:px-8 sm:py-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 piano-stripe opacity-70" />
            <div className="pointer-events-none absolute -left-20 -top-16 size-56 rounded-full bg-brand/25 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 bottom-0 size-40 rounded-full bg-white/5 blur-2xl" />
            <div className="relative">
              <p className="text-[11px] font-medium tracking-[0.18em] text-brand-300">
                رول کلاس امروز
              </p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  {weekday}
                </h1>
                <p className="rounded-full bg-white/10 px-3 py-1 font-sans text-xs tabular-nums text-white/80 ring-1 ring-white/10">
                  {toFa(slot.students.length)} هنرجو
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <MetaChip icon={Music2}>{slot.title}</MetaChip>
                {slot.start ? (
                  <MetaChip icon={Clock3}>
                    {toFa(slot.start)}
                    {slot.end ? ` تا ${toFa(slot.end)}` : ""}
                  </MetaChip>
                ) : null}
                {slot.room ? (
                  <MetaChip icon={MapPin}>{slot.room}</MetaChip>
                ) : null}
              </div>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/55">
                برای ثبت تکلیف جلسه بعد، روی نام هنرجو بزنید.
              </p>
            </div>
          </header>

          <ul className="grid gap-1.5 p-2.5 sm:p-3.5">
            {slot.students.map((student, index) => (
              <RollRow key={student.id} student={student} index={index} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function MetaChip({
  icon: Icon,
  children,
}: {
  icon: typeof Music2;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-xs text-white/80 ring-1 ring-white/10">
      <Icon className="size-3.5 opacity-70" strokeWidth={1.75} />
      {children}
    </span>
  );
}

function RollRow({
  student,
  index,
}: {
  student: RollStudent;
  index: number;
}) {
  const name = studentDisplayName(student);
  const homework = student.nextHomework
    .map((item) => item.title)
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <Link
        href={dossierHref(student)}
        className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-brand-50/70 sm:gap-4 sm:px-4 sm:py-3.5"
      >
        <span className="hidden w-6 shrink-0 text-center font-sans text-[11px] tabular-nums text-muted-foreground/70 sm:block">
          {toFa(index + 1).padStart(2, "۰")}
        </span>
        <UserAvatar
          className="size-12 rounded-2xl"
          avatarUrl={student.avatarUrl}
          alt={name}
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[15px] font-semibold text-navy">
              {name}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              سطح {toFa(student.level)}
            </span>
            {student.sessionNumber ? (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand">
                جلسه {toFa(student.sessionNumber)}
              </span>
            ) : null}
          </span>
          <span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Music2 className="size-3 shrink-0 opacity-60" strokeWidth={1.75} />
            <span className="truncate">
              {homework || student.piece || "ورود به پرونده برای ثبت تکلیف"}
            </span>
          </span>
        </span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition group-hover:bg-brand group-hover:text-white">
          <ArrowLeft className="size-4" strokeWidth={1.8} />
          <span className="sr-only">پرونده {name}</span>
        </span>
      </Link>
    </li>
  );
}
