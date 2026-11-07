"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Clock3,
  MapPin,
  Music2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { audienceError } from "@/lib/api/errors";
import { studioApi, type StudioTodayStudent } from "@/lib/api/studio";
import { studioKeys, useStudioTodayQuery } from "@/lib/api/studio-queries";
import { toFa, toLatinDigits } from "@/lib/format";
import { teacherRoutes } from "@/lib/routes";
import { studentDisplayName } from "@/lib/teacher-studio";

type RollStudent = StudioTodayStudent;

function dossierHref(student: RollStudent) {
  const path = teacherRoutes.student(
    student.id,
    student.sessionId ?? undefined,
  );
  return path.includes("?") ? `${path}&from=class` : `${path}?from=class`;
}

function swapByRow(list: RollStudent[], fromRow: number, toRow: number) {
  const from = fromRow - 1;
  const to = toRow - 1;
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= list.length ||
    to >= list.length
  ) {
    return null;
  }
  const next = [...list];
  const a = next[from]!;
  next[from] = next[to]!;
  next[to] = a;
  return next;
}

function moveByStep(list: RollStudent[], index: number, direction: -1 | 1) {
  const to = index + direction;
  if (to < 0 || to >= list.length) return list;
  return swapByRow(list, index + 1, to + 1) ?? list;
}

function parseRow(value: string) {
  const n = Number(toLatinDigits(value).trim());
  return Number.isInteger(n) && n > 0 ? n : null;
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
        <TodaySlot
          key={slot.id}
          weekday={weekday}
          courseId={slot.courseId}
          title={slot.title}
          start={slot.start}
          end={slot.end}
          room={slot.room}
          students={slot.students}
        />
      ))}
    </div>
  );
}

function TodaySlot({
  weekday,
  courseId,
  title,
  start,
  end,
  room,
  students,
}: {
  weekday: string;
  courseId: string;
  title: string;
  start: string;
  end: string;
  room: string;
  students: RollStudent[];
}) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState(students);
  const [fromRow, setFromRow] = useState("");
  const [toRow, setToRow] = useState("");
  const [swapError, setSwapError] = useState<string | null>(null);

  useEffect(() => {
    setRows(students);
  }, [students]);

  const reorder = useMutation({
    mutationFn: (studentIds: string[]) =>
      studioApi.reorderToday(courseId, studentIds),
    onSuccess: (data) => {
      queryClient.setQueryData(studioKeys.today, data);
    },
    onError: () => {
      setRows(students);
      void queryClient.invalidateQueries({ queryKey: studioKeys.today });
    },
  });

  const commit = (next: RollStudent[] | null) => {
    if (!next) return;
    setRows(next);
    reorder.mutate(next.map((item) => item.id));
  };

  const swapRows = (event: React.FormEvent) => {
    event.preventDefault();
    const from = parseRow(fromRow);
    const to = parseRow(toRow);
    if (from == null || to == null) {
      setSwapError("هر دو ردیف را بنویسید.");
      return;
    }
    const next = swapByRow(rows, from, to);
    if (!next) {
      setSwapError(`ردیف باید بین ۱ و ${toFa(rows.length)} باشد.`);
      return;
    }
    setSwapError(null);
    commit(next);
  };

  return (
    <section className="overflow-hidden rounded-[28px] border border-border/80 bg-card shadow-soft">
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
              {toFa(rows.length)} هنرجو
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <MetaChip icon={Music2}>{title}</MetaChip>
            {start ? (
              <MetaChip icon={Clock3}>
                {toFa(start)}
                {end ? ` تا ${toFa(end)}` : ""}
              </MetaChip>
            ) : null}
            {room ? <MetaChip icon={MapPin}>{room}</MetaChip> : null}
          </div>
          <p className="mt-4 max-w-lg text-sm leading-6 text-white/55">
            با فلش بالا و پایین جابه‌جا کنید، یا دو شماره ردیف را عوض کنید. برای
            ثبت تکلیف روی نام بزنید.
          </p>
        </div>
      </header>

      <form
        onSubmit={swapRows}
        className="flex flex-wrap items-end gap-2 border-b border-border bg-slate-50/80 px-3 py-3 sm:px-4"
      >
        <label className="min-w-24 flex-1 space-y-1 sm:flex-none">
          <span className="block text-[11px] text-muted-foreground">از ردیف</span>
          <Input
            value={fromRow}
            onChange={(event) => setFromRow(event.target.value)}
            inputMode="numeric"
            placeholder="۱۲"
            className="h-10 w-full tabular-nums sm:w-24"
          />
        </label>
        <label className="min-w-24 flex-1 space-y-1 sm:flex-none">
          <span className="block text-[11px] text-muted-foreground">با ردیف</span>
          <Input
            value={toRow}
            onChange={(event) => setToRow(event.target.value)}
            inputMode="numeric"
            placeholder="۲۰"
            className="h-10 w-full tabular-nums sm:w-24"
          />
        </label>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={reorder.isPending}
          className="h-10"
        >
          جابه‌جا کن
        </Button>
        {swapError ? (
          <p className="w-full text-xs text-rose-600">{swapError}</p>
        ) : (
          <p className="w-full text-[11px] text-muted-foreground sm:w-auto sm:flex-1">
            مثلاً ۱۲ را با ۲۰ عوض می‌کند.
          </p>
        )}
      </form>

      <ul className="grid gap-1.5 p-2.5 sm:p-3.5">
        {rows.map((student, index) => (
          <RollRow
            key={student.id}
            student={student}
            index={index}
            pending={reorder.isPending}
            isLast={index === rows.length - 1}
            onMove={(direction) => commit(moveByStep(rows, index, direction))}
          />
        ))}
      </ul>
    </section>
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
  pending,
  isLast,
  onMove,
}: {
  student: RollStudent;
  index: number;
  pending: boolean;
  isLast: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  const name = studentDisplayName(student);
  const homework = student.nextHomework
    .map((item) => item.title)
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <div className="group flex items-center gap-1 rounded-2xl transition hover:bg-brand-50/70 sm:gap-2">
        <span className="w-7 shrink-0 text-center font-sans text-[11px] tabular-nums text-muted-foreground/80">
          {toFa(index + 1).padStart(2, "۰")}
        </span>
        <div className="flex shrink-0 flex-col">
          <button
            type="button"
            aria-label={`بردن ${name} یک ردیف بالاتر`}
            disabled={pending || index === 0}
            onClick={() => onMove(-1)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white hover:text-navy disabled:opacity-30"
          >
            <ArrowUp className="size-3.5" strokeWidth={2.2} />
          </button>
          <button
            type="button"
            aria-label={`بردن ${name} یک ردیف پایین‌تر`}
            disabled={pending || isLast}
            onClick={() => onMove(1)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white hover:text-navy disabled:opacity-30"
          >
            <ArrowDown className="size-3.5" strokeWidth={2.2} />
          </button>
        </div>
        <Link
          href={dossierHref(student)}
          className="flex min-w-0 flex-1 items-center gap-3 py-3 pe-3 sm:gap-4 sm:py-3.5 sm:pe-4"
        >
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
      </div>
    </li>
  );
}
