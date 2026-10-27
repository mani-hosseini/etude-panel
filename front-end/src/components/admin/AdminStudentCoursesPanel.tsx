"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { adminApi, type AdminUserEnrollment } from "@/lib/api/admin-client";
import {
  adminQueryKeys,
  useAdminCoursesQuery,
} from "@/lib/api/admin-queries";
import { audienceError } from "@/lib/api/errors";
import { formatDays, parseDays, toFa } from "@/lib/format";
import { adminRoutes } from "@/lib/routes";
import { WeekdayPicker } from "@/components/ui/weekday-picker";
import { announceSaved } from "@/lib/save-feedback";

type AdminStudentCoursesPanelProps = {
  userId: string;
  enrollments: AdminUserEnrollment[];
};

export function AdminStudentCoursesPanel({
  userId,
  enrollments,
}: AdminStudentCoursesPanelProps) {
  const queryClient = useQueryClient();
  const coursesQuery = useAdminCoursesQuery({ limit: 100 });
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const enrolledSlugs = useMemo(
    () => new Set(enrollments.map((item) => item.course.id)),
    [enrollments],
  );

  const availableCourses = useMemo(() => {
    const q = search.trim();
    return (coursesQuery.data?.courses ?? []).filter((course) => {
      if (enrolledSlugs.has(course.slug)) return false;
      if (!q) return true;
      return `${course.title} ${course.teacher} ${course.instrument} ${course.day}`
        .toLowerCase()
        .includes(q.toLowerCase());
    });
  }, [coursesQuery.data?.courses, enrolledSlugs, search]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) });
    await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "course"] });
    await queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats });
  };

  const enroll = useMutation({
    mutationFn: (courseId: string) => adminApi.enrollUser(userId, courseId),
    onSuccess: async (_data, courseId) => {
      const title =
        coursesQuery.data?.courses.find((course) => course.slug === courseId)
          ?.title ?? "دوره";
      setActionError(null);
      setActionSuccess(`«${title}» به این هنرجو اضافه شد.`);
      announceSaved(`«${title}» به این هنرجو اضافه شد.`);
      setSearch("");
      await invalidate();
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(audienceError(err, "افزودن دوره انجام نشد."));
    },
  });

  const updateDays = useMutation({
    mutationFn: ({
      courseId,
      classDays,
    }: {
      courseId: string;
      classDays: string[];
    }) => adminApi.updateEnrollmentDays(userId, courseId, classDays),
    onSuccess: async () => {
      setActionError(null);
      setActionSuccess("روزهای کلاس این دوره ذخیره شد.");
      announceSaved("روزهای کلاس این دوره ذخیره شد.");
      await invalidate();
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(audienceError(err, "ذخیره روزهای کلاس انجام نشد."));
    },
  });

  const unenroll = useMutation({
    mutationFn: (courseId: string) => adminApi.unenrollUser(userId, courseId),
    onSuccess: async () => {
      setActionError(null);
      setActionSuccess("دسترسی دوره حذف شد.");
      await invalidate();
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(audienceError(err, "حذف دوره انجام نشد."));
    },
  });

  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-900">دوره‌های این هنرجو</h3>
        <p className="mt-1 text-xs text-slate-500">
          هر دوره را اضافه کنید و بعد مشخص کنید این هنرجو در کدام روزهای همان
          دوره کلاس دارد.
        </p>
      </div>

      <div className="space-y-5 p-5">
        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جستجوی دوره، استاد یا ساز…"
              className="rounded-xl bg-white pr-10"
            />
          </div>
          {coursesQuery.isError ? (
            <p className="text-sm text-rose-600">
              {audienceError(coursesQuery.error, "فهرست دوره‌ها در دسترس نیست.")}
            </p>
          ) : availableCourses.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              {enrolledSlugs.size > 0 && !search.trim()
                ? "همه دوره‌های موجود برای این هنرجو اضافه شده‌اند."
                : "دوره‌ای برای افزودن پیدا نشد."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
              {availableCourses.map((course) => (
                <li
                  key={course.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{course.title}</p>
                    <p className="text-xs text-slate-500">
                      {course.teacher} · {course.instrument} ·{" "}
                      {formatDays(course.days, course.day)} {course.timeShort}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-xl"
                    disabled={enroll.isPending}
                    onClick={() => enroll.mutate(course.slug)}
                  >
                    <Plus className="size-3.5" />
                    افزودن
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {enrollments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            <BookOpen className="mx-auto mb-2 size-8 text-slate-300" />
            این هنرجو هنوز به هیچ دوره‌ای دسترسی ندارد.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {enrollments.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={adminRoutes.course(item.course.id)}
                      className="font-semibold text-slate-900 hover:text-brand"
                    >
                      {item.course.title}
                    </Link>
                    <Badge variant="secondary" className="rounded-lg">
                      {item.course.instrument}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.course.teacher}
                    {item.currentSessionNumber
                      ? ` · جلسه جاری ${toFa(item.currentSessionNumber)}`
                      : ""}
                  </p>
                  {parseDays(item.course.days, item.course.day).length > 0 ? (
                    <div className="mt-3 max-w-md">
                      <p className="mb-1.5 text-[11px] text-slate-500">
                        روزهای کلاس این هنرجو در این دوره
                      </p>
                      <WeekdayPicker
                        size="sm"
                        options={parseDays(item.course.days, item.course.day)}
                        value={parseDays(
                          item.classDays,
                          parseDays(item.course.days, item.course.day).join("، "),
                        )}
                        disabled={updateDays.isPending}
                        onChange={(classDays) =>
                          updateDays.mutate({
                            courseId: item.course.id,
                            classDays,
                          })
                        }
                      />
                    </div>
                  ) : null}
                  <div className="mt-3 max-w-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>پیشرفت دوره</span>
                      <span className="font-sans font-semibold tabular-nums text-brand">
                        {toFa(item.progress ?? 0)}٪
                      </span>
                    </div>
                    <Progress value={item.progress ?? 0} />
                    <p className="text-[11px] text-slate-400">
                      {toFa(item.sessionsDone ?? 0)} از{" "}
                      {toFa(item.sessionsTotal ?? 0)} جلسه
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  disabled={unenroll.isPending}
                  onClick={() => unenroll.mutate(item.course.id)}
                >
                  <Trash2 className="size-3.5" />
                  حذف دسترسی
                </Button>
              </li>
            ))}
          </ul>
        )}

        {actionError ? (
          <p className="text-sm text-rose-600">{actionError}</p>
        ) : null}
        {actionSuccess ? (
          <p className="text-sm text-emerald-600">{actionSuccess}</p>
        ) : null}
      </div>
    </Card>
  );
}
