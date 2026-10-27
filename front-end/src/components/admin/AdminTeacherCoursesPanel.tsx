"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  adminApi,
  type AdminTaughtCourse,
} from "@/lib/api/admin-client";
import {
  adminQueryKeys,
  useAdminCoursesQuery,
} from "@/lib/api/admin-queries";
import { audienceError } from "@/lib/api/errors";
import { announceSaved } from "@/lib/save-feedback";
import { adminRoutes } from "@/lib/routes";

type AdminTeacherCoursesPanelProps = {
  userId: string;
  taughtCourses: AdminTaughtCourse[];
};

export function AdminTeacherCoursesPanel({
  userId,
  taughtCourses,
}: AdminTeacherCoursesPanelProps) {
  const queryClient = useQueryClient();
  const coursesQuery = useAdminCoursesQuery({ limit: 100 });
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const taughtSlugs = useMemo(
    () => new Set(taughtCourses.map((item) => item.id)),
    [taughtCourses],
  );

  const availableCourses = useMemo(() => {
    const q = search.trim();
    return (coursesQuery.data?.courses ?? []).filter((course) => {
      if (taughtSlugs.has(course.slug) || course.teacherId === userId) {
        return false;
      }
      if (!q) return true;
      return `${course.title} ${course.instrument} ${course.day}`
        .toLowerCase()
        .includes(q.toLowerCase());
    });
  }, [coursesQuery.data?.courses, taughtSlugs, search, userId]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) });
    await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "course"] });
  };

  const assign = useMutation({
    mutationFn: (courseId: string) =>
      adminApi.assignTaughtCourse(userId, courseId),
    onSuccess: async (_data, courseId) => {
      const title =
        coursesQuery.data?.courses.find((course) => course.slug === courseId)
          ?.title ?? "دوره";
      setActionError(null);
      setActionSuccess(`تدریس «${title}» به این استاد داده شد.`);
      announceSaved(`تدریس «${title}» به این استاد داده شد.`);
      setSearch("");
      await invalidate();
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(audienceError(err, "واگذاری دوره انجام نشد."));
    },
  });

  const unassign = useMutation({
    mutationFn: (courseId: string) =>
      adminApi.unassignTaughtCourse(userId, courseId),
    onSuccess: async () => {
      setActionError(null);
      setActionSuccess("دوره از تدریس این استاد برداشته شد.");
      await invalidate();
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(audienceError(err, "حذف دوره تدریس انجام نشد."));
    },
  });

  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-900">دوره‌های تدریس</h3>
        <p className="mt-1 text-xs text-slate-500">
          هر دوره‌ای که این استاد باید در پنل خودش و برای هنرجویان مدیریت کند را
          اینجا اضافه کنید.
        </p>
      </div>
      <div className="space-y-5 p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="جستجوی دوره…"
            className="rounded-xl bg-white pr-10"
          />
        </div>
        {availableCourses.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            دوره‌ای برای واگذاری نمانده است.
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
                    {course.instrument} · {course.day} {course.timeShort}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl"
                  disabled={assign.isPending}
                  onClick={() => assign.mutate(course.slug)}
                >
                  <Plus className="size-3.5" />
                  واگذاری
                </Button>
              </li>
            ))}
          </ul>
        )}

        {taughtCourses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            <BookOpen className="mx-auto mb-2 size-8 text-slate-300" />
            هنوز دوره‌ای به این استاد داده نشده است.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {taughtCourses.map((course) => (
              <li
                key={course.uuid}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={adminRoutes.course(course.id)}
                      className="font-semibold text-slate-900 hover:text-brand"
                    >
                      {course.title}
                    </Link>
                    <Badge variant="secondary">{course.instrument}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {course.day} {course.timeShort}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  disabled={unassign.isPending}
                  onClick={() => unassign.mutate(course.id)}
                >
                  <Trash2 className="size-3.5" />
                  برداشتن
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
