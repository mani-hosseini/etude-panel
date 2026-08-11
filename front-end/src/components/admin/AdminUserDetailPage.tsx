"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Trash2 } from "lucide-react";

import { AdminConfirmDelete } from "@/components/admin/AdminConfirmDelete";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api/admin-client";
import {
  adminQueryKeys,
  useAdminCoursesQuery,
  useAdminUserQuery,
} from "@/lib/api/admin-queries";
import { ApiError } from "@/lib/api/http";
import { toFa } from "@/lib/format";
import { adminRoutes } from "@/lib/routes";

type AdminUserDetailPageProps = {
  userId: string;
};

export function AdminUserDetailPage({ userId }: AdminUserDetailPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userQuery = useAdminUserQuery(userId);
  const coursesQuery = useAdminCoursesQuery({ limit: 100, isActive: true });
  const [selectedCourse, setSelectedCourse] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const enrolledSlugs = useMemo(
    () => new Set(userQuery.data?.enrollments.map((e) => e.course.id) ?? []),
    [userQuery.data?.enrollments],
  );

  const availableCourses = useMemo(
    () =>
      (coursesQuery.data?.courses ?? []).filter(
        (course) => !enrolledSlugs.has(course.slug),
      ),
    [coursesQuery.data?.courses, enrolledSlugs],
  );

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) });
    await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    await queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats });
  };

  const enroll = useMutation({
    mutationFn: (courseId: string) => adminApi.enrollUser(userId, courseId),
    onSuccess: async () => {
      setSelectedCourse("");
      setActionError(null);
      await invalidate();
    },
    onError: (err) => {
      setActionError(
        err instanceof ApiError ? err.message : "افزودن دسترسی ناموفق بود.",
      );
    },
  });

  const unenroll = useMutation({
    mutationFn: (courseId: string) => adminApi.unenrollUser(userId, courseId),
    onSuccess: async () => {
      setActionError(null);
      await invalidate();
    },
    onError: (err) => {
      setActionError(
        err instanceof ApiError ? err.message : "حذف دسترسی ناموفق بود.",
      );
    },
  });

  const removeUser = useMutation({
    mutationFn: () => adminApi.deleteUser(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats });
      router.replace(adminRoutes.users);
    },
  });

  if (userQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (userQuery.isError || !userQuery.data) {
    return (
      <Card className="rounded-2xl border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {userQuery.error instanceof ApiError
          ? userQuery.error.message
          : "کاربر یافت نشد."}
      </Card>
    );
  }

  const user = userQuery.data;
  const isStudent = user.role === "STUDENT";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="مدیریت کاربران"
        title={user.displayName}
        description={
          isStudent
            ? `کد هنرجو: ${user.studentCode ?? "—"} · ${user.isActive ? "فعال" : "غیرفعال"}`
            : user.email ?? "ادمین"
        }
        backHref={adminRoutes.users}
        backLabel="لیست کاربران"
        actions={
          isStudent ? (
            <AdminConfirmDelete
              title="حذف هنرجو"
              description={`آیا از حذف «${user.displayName}» مطمئن هستید؟ این عمل قابل بازگشت نیست.`}
              triggerLabel="حذف هنرجو"
              iconOnly={false}
              disabled={removeUser.isPending}
              onConfirm={() => removeUser.mutate()}
            />
          ) : null
        }
      />

      <Card className="rounded-2xl border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
            {user.role === "ADMIN" ? "ادمین" : "هنرجو"}
          </Badge>
          <Badge variant={user.isActive ? "success" : "warning"}>
            {user.isActive ? "فعال" : "غیرفعال"}
          </Badge>
          {user.level ? <Badge variant="outline">{user.level}</Badge> : null}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          عضویت از {toFa(new Date(user.createdAt).toLocaleDateString("fa-IR"))}
        </p>
      </Card>

      {isStudent ? (
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-900">
              دسترسی به دوره‌ها
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              هنرجو فقط به دوره‌هایی که اینجا اضافه کنید دسترسی دارد.
            </p>
          </div>

          <div className="space-y-4 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1.5">
                <label className="text-xs font-medium text-slate-600">
                  افزودن دوره
                </label>
                <Select
                  value={selectedCourse}
                  onValueChange={setSelectedCourse}
                  disabled={enroll.isPending || coursesQuery.isPending}
                >
                  <SelectTrigger className="rounded-xl bg-white">
                    <SelectValue placeholder="انتخاب دوره…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCourses.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        دوره‌ای برای افزودن نیست
                      </SelectItem>
                    ) : (
                      availableCourses.map((course) => (
                        <SelectItem key={course.id} value={course.slug}>
                          {course.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                className="rounded-xl"
                disabled={!selectedCourse || enroll.isPending}
                onClick={() => enroll.mutate(selectedCourse)}
              >
                <Plus className="size-4" />
                افزودن دسترسی
              </Button>
            </div>

            {user.enrollments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                <BookOpen className="mx-auto mb-2 size-8 text-slate-300" />
                این هنرجو هنوز به هیچ دوره‌ای دسترسی ندارد.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {user.enrollments.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {item.course.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.course.teacher} · {item.course.instrument}
                      </p>
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
          </div>
        </Card>
      ) : null}

      {actionError ? (
        <p className="text-sm text-rose-600">{actionError}</p>
      ) : null}
      {removeUser.isError ? (
        <p className="text-sm text-rose-600">
          {removeUser.error instanceof ApiError
            ? removeUser.error.message
            : "حذف کاربر ناموفق بود."}
        </p>
      ) : null}
    </div>
  );
}
