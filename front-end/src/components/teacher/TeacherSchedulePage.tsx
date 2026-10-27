"use client";

import Link from "next/link";

import { PageHeader } from "@/components/panel/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { audienceError } from "@/lib/api/errors";
import { useStudioScheduleQuery } from "@/lib/api/studio-queries";
import { toFa } from "@/lib/format";
import { teacherRoutes } from "@/lib/routes";
import { studentDisplayName } from "@/lib/teacher-studio";
import { cn } from "@/lib/utils";

export function TeacherSchedulePage() {
  const query = useStudioScheduleQuery();

  if (query.isPending) {
    return <Skeleton className="h-96 rounded-2xl" />;
  }

  if (query.isError || !query.data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {audienceError(query.error, "برنامه کلاس در دسترس نیست.")}
      </div>
    );
  }

  const { today, days, students } = query.data;
  const studentsById = new Map(students.map((item) => [item.id, item]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="تقویم استودیو"
        title="برنامه کلاس"
        description="روزها و ساعت‌هایی که هنرجویان شما در اتود کلاس دارند."
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {days.map((block) => {
          const isToday = block.day === today;
          return (
            <section
              key={block.day}
              className={cn(
                "min-h-40 rounded-2xl border bg-card p-4",
                isToday ? "border-brand/40 ring-1 ring-brand/15" : "border-border",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-navy">{block.day}</h3>
                {isToday ? (
                  <Link
                    href={teacherRoutes.class}
                    className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand hover:bg-brand-100"
                  >
                    رول امروز
                  </Link>
                ) : null}
              </div>
              {block.slots.length === 0 ? (
                <p className="mt-6 text-center text-xs text-muted-foreground">
                  کلاسی نیست
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {block.slots.map((item) => {
                    const roster = item.studentIds
                      .map((studentId) => studentsById.get(studentId))
                      .filter(Boolean);
                    return (
                      <li
                        key={item.id}
                        className="rounded-xl border border-border/80 bg-muted/25 p-3"
                      >
                        <p className="text-sm font-medium text-navy">{item.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {toFa(item.start)}
                          {item.end ? ` تا ${toFa(item.end)}` : ""} · {item.room}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {item.focus}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {roster.map((student) =>
                            student ? (
                              <Link
                                key={student.id}
                                href={teacherRoutes.student(student.id)}
                                className="rounded-full bg-white px-2 py-0.5 text-[11px] text-navy ring-1 ring-border hover:ring-navy/30"
                              >
                                {studentDisplayName(student)}
                              </Link>
                            ) : null,
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
