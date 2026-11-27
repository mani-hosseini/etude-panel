"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type LessonLogLesson,
  type LessonLogSession,
  type LessonLogStudent,
  type LessonLogParams,
} from "@/lib/api/admin-client";
import { useAdminLessonLogQuery } from "@/lib/api/admin-queries";
import { audienceError } from "@/lib/api/errors";
import { formatDateTimeFa, toFa } from "@/lib/format";
import { formatJalali } from "@/lib/jalali";
import { cn } from "@/lib/utils";

const ALL = "all";

function wasEdited(item: LessonLogLesson) {
  return (
    new Date(item.updatedAt).getTime() - new Date(item.enteredAt).getTime() >
    60_000
  );
}

function sessionLabel(session: LessonLogSession) {
  return [
    session.courseTitle,
    session.heldOn
      ? formatJalali(session.heldOn)
      : session.sessionNumber != null
        ? `نوبت ${toFa(session.sessionNumber)}`
        : null,
    `ترم ${toFa(session.term)}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function latestSessionLabel(student: LessonLogStudent) {
  const session = student.sessions[student.sessions.length - 1];
  if (!session) return "";
  if (session.heldOn) return `تا ${formatJalali(session.heldOn)}`;
  if (session.sessionNumber != null) return `تا نوبت ${toFa(session.sessionNumber)}`;
  return `ترم ${toFa(session.term)}`;
}

export function AdminLessonLogPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [teacherId, setTeacherId] = useState(ALL);
  const [studentId, setStudentId] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = search.trim();
      setDebouncedSearch((current) => {
        if (current !== next) setPage(1);
        return next;
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setOpenId(null);
  }, [page, teacherId, studentId, category, debouncedSearch]);

  const params: LessonLogParams = {
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    teacherId: teacherId === ALL ? undefined : teacherId,
    studentId: studentId === ALL ? undefined : studentId,
    category: category === ALL ? undefined : category,
  };
  const logQuery = useAdminLessonLogQuery(params);
  const data = logQuery.data;
  const studentTotal = data?.meta.total ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          لاگ درس‌ها
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          هنرجوها به ترتیب نام زیر استادشان هستند. درس‌های هر نفر با باز کردن ردیف دیده می‌شود.
        </p>
      </div>

      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
        <label className="relative sm:col-span-2 xl:col-span-1">
          <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="جستجوی استاد، هنرجو، کتاب یا درس"
            className="h-10 rounded-xl pr-9"
          />
        </label>
        <Select
          value={teacherId}
          onValueChange={(value) => {
            setTeacherId(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue placeholder="همه استادها" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={ALL}>همه استادها</SelectItem>
            {(data?.teachers ?? []).map((teacher) => (
              <SelectItem key={teacher.id} value={teacher.id}>
                {teacher.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={studentId}
          onValueChange={(value) => {
            setStudentId(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue placeholder="همه هنرجوها" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={ALL}>همه هنرجوها</SelectItem>
            {(data?.students ?? []).map((student) => (
              <SelectItem key={student.id} value={student.id}>
                {student.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={category}
          onValueChange={(value) => {
            setCategory(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue placeholder="همه محورها" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>همه محورها</SelectItem>
            {(data?.categories ?? []).map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {logQuery.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-14 rounded-3xl" />
          <Skeleton className="h-14 rounded-3xl" />
          <Skeleton className="h-14 rounded-3xl" />
        </div>
      ) : logQuery.isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
          {audienceError(logQuery.error, "لاگ درس‌ها الان در دسترس نیست.")}
        </div>
      ) : data && studentTotal === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          درسی با این فیلتر ثبت نشده است.
        </div>
      ) : data ? (
        <>
          <p className="text-xs text-slate-500">
            {toFa(studentTotal)} هنرجو · {toFa(data.lessonCount)} درس
          </p>
          <div className="space-y-4">
            {data.groups.map((group) => (
              <section
                key={group.teacher.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <header className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    {group.teacher.displayName}
                  </h3>
                </header>
                <ul>
                  {group.students.map((student) => (
                    <StudentRow
                      key={student.id}
                      student={student}
                      open={openId === student.id}
                      onToggle={() =>
                        setOpenId((current) =>
                          current === student.id ? null : student.id,
                        )
                      }
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
          {data.meta.totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={!data.meta.hasPrevPage}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                قبلی
              </Button>
              <p className="text-sm text-slate-500">
                صفحه {toFa(data.meta.page)} از {toFa(data.meta.totalPages)}
              </p>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={!data.meta.hasNextPage}
                onClick={() => setPage((current) => current + 1)}
              >
                بعدی
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function StudentRow({
  student,
  open,
  onToggle,
}: {
  student: LessonLogStudent;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-right transition hover:bg-slate-50"
      >
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180",
          )}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
          {student.student.displayName}
        </span>
        <span className="shrink-0 text-xs text-slate-500">
          {latestSessionLabel(student)}
        </span>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          {toFa(student.lessonCount)} درس
        </span>
      </button>
      {open ? (
        <div className="space-y-3 bg-slate-50/70 px-4 py-3 sm:px-11">
          {student.sessions.map((session) => (
            <div key={session.id}>
              <p className="mb-1.5 text-[11px] font-semibold text-slate-500">
                {sessionLabel(session)}
              </p>
              <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {session.lessons.map((lesson) => (
                  <li
                    key={lesson.id}
                    className="border-b border-slate-100 px-3 py-2 last:border-b-0"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                        {lesson.category || "درس"}
                      </span>
                      <span className="text-sm font-medium text-slate-800">
                        {lesson.title || "بدون عنوان"}
                      </span>
                      <span className="text-sm text-slate-600">
                        {lesson.lessons || "—"}
                      </span>
                      <span className="ms-auto text-[11px] text-slate-400">
                        {formatDateTimeFa(
                          wasEdited(lesson) ? lesson.updatedAt : lesson.enteredAt,
                        )}
                        {wasEdited(lesson) ? " · ویرایش" : ""}
                      </span>
                    </div>
                    {lesson.note ? (
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {lesson.note}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </li>
  );
}
