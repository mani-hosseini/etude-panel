"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/panel/PageHeader";
import { TeacherStudentStars } from "@/components/teacher/TeacherStudentStars";
import { StatCard } from "@/components/panel/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentSession } from "@/hooks/useStudentSession";
import { audienceError } from "@/lib/api/errors";
import { type StudioStudent } from "@/lib/api/studio";
import { useStudioOverviewQuery } from "@/lib/api/studio-queries";
import { executionScoreLabel, toFa } from "@/lib/format";
import { teacherRoutes } from "@/lib/routes";
import { studentDisplayName } from "@/lib/teacher-studio";

export function TeacherDashboard() {
  const session = useStudentSession();
  const overview = useStudioOverviewQuery();

  if (overview.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (overview.isError || !overview.data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {audienceError(overview.error, "استودیو الان در دسترس نیست.")}
      </div>
    );
  }

  const { stats, nextClass, recentAssignments, students } = overview.data;
  const nextStudents = students.filter((item) => {
    if (!nextClass) return false;
    if (item.classId !== nextClass.id) return false;
    if (item.classDays && item.classDays.length > 0) {
      return item.classDays.includes(nextClass.day);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="استودیو تدریس"
        title={`${session.displayName} عزیز، خوش آمدید`}
        description="هنرجویان، تمرین‌های هفته و روزهای کلاس از همین‌جا مدیریت می‌شود."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="هنرجویان"
          value={String(stats.students)}
          hint={`${toFa(stats.classes)} کلاس فعال`}
        />
        <StatCard
          label="تمرین فعال"
          value={String(stats.activeAssignments)}
          hint="هنوز به ۱۰۰٪ نرسیده"
          index={1}
        />
        <StatCard
          label="حضور میانگین"
          value={`${stats.avgAttendance}٪`}
          hint="در همه کلاس‌ها"
          index={2}
        />
        <StatCard
          label="کلاس این هفته"
          value={String(stats.classes)}
          hint={nextClass ? `${nextClass.day} نزدیک‌ترین` : "کلاسی ثبت نشده"}
          index={3}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-border bg-navy p-5 text-white sm:p-6">
          <p className="text-[11px] font-medium tracking-wide text-brand-300">
            نزدیک‌ترین کلاس
          </p>
          <h3 className="mt-1 text-xl font-semibold">
            {nextClass?.title ?? "دوره‌ای واگذار نشده"}
          </h3>
          {nextClass ? (
            <>
              <p className="mt-1 text-sm text-white/60">
                {nextClass.day} · {toFa(nextClass.start)}
                {nextClass.end ? ` تا ${toFa(nextClass.end)}` : ""} ·{" "}
                {nextClass.room}
              </p>
              <p className="mt-3 text-sm text-white/75">{nextClass.focus}</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-white/65">
              از پنل ادمین یک دوره به این استاد بدهید.
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {nextStudents.map((student) => (
              <Link
                key={student.id}
                href={teacherRoutes.student(student.id)}
                className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/90 ring-1 ring-white/10 hover:bg-white/15"
              >
                {studentDisplayName(student)}
              </Link>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href={teacherRoutes.class}>رول امروز کلاس</Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href={teacherRoutes.students}>هنرجویان</Link>
            </Button>
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-navy">تمرین هنرجویان</h3>
            <Link
              href={teacherRoutes.students}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-navy"
            >
              پرونده‌ها
              <ArrowLeft className="size-3.5" />
            </Link>
          </div>
          <ul className="space-y-3">
            {recentAssignments.map((item) => {
              const href = item.studentIds[0]
                ? teacherRoutes.student(item.studentIds[0])
                : teacherRoutes.students;
              return (
                <li key={item.id}>
                  <Link
                    href={href}
                    className="block rounded-xl border border-border/80 p-3 hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-navy">{item.title}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {item.targets[0]?.displayName ||
                            item.classTitle ||
                            `${item.studentIds.length} هنرجو`}{" "}
                          · {item.dueLabel}
                        </p>
                      </div>
                      <Badge variant="outline">{item.category}</Badge>
                    </div>
                    <Progress
                      value={item.targets[0]?.score ?? item.progress}
                      className="mt-3"
                    />
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {executionScoreLabel(item.targets[0]?.score ?? item.progress)}
                    </p>
                  </Link>
                </li>
              );
            })}
            {recentAssignments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                هنوز تمرینی ثبت نشده است.
              </p>
            ) : null}
          </ul>
        </article>
      </section>

      <StudioRoster students={students} />
    </div>
  );
}

function StudioRoster({ students }: { students: StudioStudent[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold text-navy">هنرجویان استودیو</h3>
          {students.length > 0 ? (
            <span className="rounded-full bg-muted px-2 py-0.5 font-sans text-[11px] tabular-nums text-muted-foreground">
              {toFa(students.length)}
            </span>
          ) : null}
        </div>
        <Link
          href={teacherRoutes.students}
          className="text-xs font-medium text-muted-foreground transition hover:text-navy"
        >
          فهرست کامل
        </Link>
      </div>

      {students.length === 0 ? (
        <p className="px-5 pb-8 text-center text-sm text-muted-foreground">
          وقتی هنرجو در کلاس‌های شما ثبت شود، اینجا دیده می‌شود.
        </p>
      ) : (
        <ul className="grid gap-1 p-2 sm:grid-cols-2 sm:p-3">
          {students.map((student) => (
            <li key={student.id}>
              <Link
                href={teacherRoutes.student(student.id)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-muted/70"
              >
                <UserAvatar
                  className="size-10"
                  avatarUrl={student.avatarUrl}
                  alt={studentDisplayName(student)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-navy">
                    {studentDisplayName(student)}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] leading-5 text-muted-foreground">
                    سطح {toFa(student.level)}
                    {student.piece ? ` · ${student.piece}` : ""}
                  </span>
                </span>
                <span
                  className="shrink-0"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  <TeacherStudentStars
                    studentId={student.id}
                    stars={student.stars ?? 0}
                    size="sm"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
