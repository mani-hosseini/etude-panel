"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Search } from "lucide-react";

import { AdminConfirmDelete } from "@/components/admin/AdminConfirmDelete";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api/admin-client";
import { useAdminCoursesQuery } from "@/lib/api/admin-queries";
import { audienceError } from "@/lib/api/errors";
import { toFa } from "@/lib/format";
import { adminRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const statusLabel: Record<string, string> = {
  ACTIVE: "فعال",
  UPCOMING: "به‌زودی",
  COMPLETED: "پایان‌یافته",
};

export function AdminCoursesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");

  const params = useMemo(
    () => ({ page, limit: 20, search: search || undefined }),
    [page, search],
  );
  const query = useAdminCoursesQuery(params);

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteCourse(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
    },
  });

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <Card className="rounded-2xl border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {audienceError(query.error, "فهرست دوره‌ها الان در دسترس نیست.")}
      </Card>
    );
  }

  const { courses, meta } = query.data;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="مدیریت محتوا"
        title="دوره‌ها"
        description="ساخت، ویرایش و حذف دوره‌ها و جلسات آموزشی."
        actions={
          <Button asChild className="rounded-xl">
            <Link href={adminRoutes.courseNew}>
              <Plus className="size-4" />
              دوره جدید
            </Link>
          </Button>
        }
      />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                setSearch(searchDraft.trim());
              }
            }}
            placeholder="جستجو عنوان، استاد یا اسلاگ…"
            className="rounded-xl bg-white pe-3 ps-10"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={() => {
            setPage(1);
            setSearch(searchDraft.trim());
          }}
        >
          جستجو
        </Button>
      </div>

      <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
        {courses.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <BookOpen className="size-10 text-slate-300" />
            <p className="text-sm text-slate-500">هنوز دوره‌ای ثبت نشده.</p>
            <Button asChild className="rounded-xl">
              <Link href={adminRoutes.courseNew}>ایجاد اولین دوره</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex flex-col gap-3 px-4 py-4 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={adminRoutes.course(course.slug)}
                    className="truncate text-sm font-bold text-slate-900 hover:text-brand"
                  >
                    {course.title}
                  </Link>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "rounded-lg",
                        course.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {course.isActive ? "فعال" : "غیرفعال"}
                    </Badge>
                    <Badge variant="outline" className="rounded-lg">
                      {statusLabel[course.status] ?? course.status}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {course.teacher} · {course.day} {course.timeShort} ·{" "}
                    {toFa(course.sessionsCount)} جلسه ·{" "}
                    {toFa(course.enrollmentsCount)} هنرجو
                  </p>
                  <p
                    className="mt-0.5 font-mono text-[11px] text-slate-400"
                    dir="ltr"
                  >
                    {course.slug}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button asChild variant="outline" size="sm" className="rounded-xl">
                    <Link href={adminRoutes.course(course.slug)}>مدیریت</Link>
                  </Button>
                  <AdminConfirmDelete
                    title="حذف دوره؟"
                    description={`دوره «${course.title}» و تمام جلسات/اسلایدهایش حذف می‌شود.`}
                    onConfirm={() => remove.mutate(course.id)}
                    disabled={remove.isPending}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            قبلی
          </Button>
          <span className="text-xs text-slate-500">
            {toFa(page)} از {toFa(totalPages)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            بعدی
          </Button>
        </div>
      ) : null}
    </div>
  );
}
