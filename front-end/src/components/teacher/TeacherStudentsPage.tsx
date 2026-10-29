"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { PageHeader } from "@/components/panel/PageHeader";
import { TeacherStudentLevel } from "@/components/teacher/TeacherStudentLevel";
import { TeacherStudentStars } from "@/components/teacher/TeacherStudentStars";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { audienceError } from "@/lib/api/errors";
import {
  useStudioOverviewQuery,
  useStudioStudentsQuery,
} from "@/lib/api/studio-queries";
import { formatDays, parseDays, toFa, WEEKDAYS } from "@/lib/format";
import { teacherRoutes } from "@/lib/routes";
import { studentDisplayName } from "@/lib/teacher-studio";
import { cn } from "@/lib/utils";

export function TeacherStudentsPage() {
  const [query, setQuery] = useState("");
  const [weekday, setWeekday] = useState("all");
  const studentsQuery = useStudioStudentsQuery();
  const overview = useStudioOverviewQuery();

  const students = studentsQuery.data ?? [];
  const classes = overview.data?.classes ?? [];
  const weekdays = useMemo(() => {
    const selected = new Set<string>();
    for (const item of classes) {
      for (const day of parseDays(item.days, item.day)) selected.add(day);
    }
    return WEEKDAYS.filter((day) => selected.has(day));
  }, [classes]);

  const rows = useMemo(() => {
    const q = query.trim();
    return students.filter((student) => {
      const days = parseDays(student.classDays);
      const inDay =
        weekday === "all" ||
        (days.length > 0 ? days.includes(weekday) : true);
      const hay = `${studentDisplayName(student)} ${student.piece}`;
      return inDay && (!q || hay.includes(q));
    });
  }, [query, weekday, students]);

  if (studentsQuery.isPending || overview.isPending) {
    return <Skeleton className="h-80 rounded-2xl" />;
  }

  if (studentsQuery.isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {audienceError(studentsQuery.error, "هنرجویان الان در دسترس نیستند.")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="استودیو"
        title="هنرجویان"
        description={`${toFa(students.length)} هنرجوی کلاس‌های شما. تمرین، حضور و امتیاز اجرا را از پرونده هر نفر ثبت کنید.`}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="جستجوی نام یا قطعه…"
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={weekday === "all"}
            onClick={() => setWeekday("all")}
          >
            همه
          </FilterChip>
          {weekdays.map((day) => (
            <FilterChip
              key={day}
              active={weekday === day}
              onClick={() => setWeekday(day)}
            >
              {day}
            </FilterChip>
          ))}
        </div>
      </div>

      <ul className="grid gap-3 md:grid-cols-2">
        {rows.map((student) => {
          const session = classes.find((item) => item.id === student.classId);
          return (
            <li
              key={student.id}
              className="rounded-2xl border border-border bg-card transition hover:border-navy/20 hover:bg-muted/30"
            >
              <Link
                href={teacherRoutes.student(student.id)}
                scroll
                className="flex items-start gap-3 p-4 pb-2"
              >
                <UserAvatar
                  className="size-11"
                  avatarUrl={student.avatarUrl}
                  alt={studentDisplayName(student)}
                />
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-semibold text-navy">
                    {studentDisplayName(student)}
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {student.piece}
                  </span>
                  <span className="mt-2 block text-[11px] text-muted-foreground">
                    {session
                      ? `${formatDays(student.classDays, session.day)} ${toFa(session.start)} · حضور ${toFa(student.attendanceRate)}٪`
                      : null}
                  </span>
                </span>
              </Link>
              <div className="flex flex-col gap-2 px-4 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="sm:max-w-44">
                  <TeacherStudentLevel
                    studentId={student.id}
                    level={student.level}
                  />
                </div>
                <TeacherStudentStars
                  studentId={student.id}
                  stars={student.stars ?? 0}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          هنرجویی با این فیلتر پیدا نشد.
        </p>
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition",
        active
          ? "bg-navy text-white ring-navy"
          : "bg-white text-muted-foreground ring-border hover:text-navy",
      )}
    >
      {children}
    </button>
  );
}
