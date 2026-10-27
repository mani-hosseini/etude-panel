"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StudentLevelBadge } from "@/components/ui/student-level-badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  adminApi,
  type AdminCourseEnrollment,
} from "@/lib/api/admin-client";
import {
  adminQueryKeys,
  useAdminUsersQuery,
} from "@/lib/api/admin-queries";
import { audienceError } from "@/lib/api/errors";
import { parseDays, toFa } from "@/lib/format";
import { adminRoutes } from "@/lib/routes";
import { WeekdayPicker } from "@/components/ui/weekday-picker";
import { announceSaved } from "@/lib/save-feedback";

type AdminCourseStudentsPanelProps = {
  courseSlug: string;
  courseDays?: string[];
  courseDay?: string;
  enrollments: AdminCourseEnrollment[];
};

export function AdminCourseStudentsPanel({
  courseSlug,
  courseDays,
  courseDay,
  enrollments,
}: AdminCourseStudentsPanelProps) {
  const allowedDays = parseDays(courseDays, courseDay);
  const queryClient = useQueryClient();
  const studentsQuery = useAdminUsersQuery({
    role: "STUDENT",
    limit: 200,
    isActive: true,
  });
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const enrolledIds = useMemo(
    () => new Set(enrollments.map((item) => item.user.id)),
    [enrollments],
  );

  const availableStudents = useMemo(() => {
    const q = search.trim();
    return (studentsQuery.data?.users ?? []).filter((user) => {
      if (enrolledIds.has(user.id)) return false;
      if (!q) return true;
      return `${user.displayName} ${user.nationalId ?? ""} ${user.phone ?? ""}`
        .toLowerCase()
        .includes(q.toLowerCase());
    });
  }, [studentsQuery.data?.users, enrolledIds, search]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: adminQueryKeys.course(courseSlug),
    });
    await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "course"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "user"] });
  };

  const enroll = useMutation({
    mutationFn: (userId: string) => adminApi.enrollUser(userId, courseSlug),
    onSuccess: async (_data, userId) => {
      const name =
        studentsQuery.data?.users.find((user) => user.id === userId)
          ?.displayName ?? "هنرجو";
      setActionError(null);
      setActionSuccess(`«${name}» به این دوره اضافه شد.`);
      announceSaved(`«${name}» به این دوره اضافه شد.`);
      setSearch("");
      await invalidate();
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(audienceError(err, "افزودن هنرجو انجام نشد."));
    },
  });

  const updateDays = useMutation({
    mutationFn: ({
      userId,
      classDays,
    }: {
      userId: string;
      classDays: string[];
    }) => adminApi.updateEnrollmentDays(userId, courseSlug, classDays),
    onSuccess: async () => {
      setActionError(null);
      setActionSuccess("روزهای کلاس هنرجو ذخیره شد.");
      announceSaved("روزهای کلاس هنرجو ذخیره شد.");
      await invalidate();
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(audienceError(err, "ذخیره روزهای کلاس انجام نشد."));
    },
  });

  const unenroll = useMutation({
    mutationFn: (userId: string) => adminApi.unenrollUser(userId, courseSlug),
    onSuccess: async () => {
      setActionError(null);
      setActionSuccess("هنرجو از این دوره حذف شد.");
      await invalidate();
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(audienceError(err, "حذف هنرجو از دوره انجام نشد."));
    },
  });

  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-900">هنرجویان این دوره</h3>
        <p className="mt-1 text-xs text-slate-500">
          هنرجو را به دوره اضافه کنید، بعد روز کلاسش را از روزهای همین دوره
          انتخاب کنید.
        </p>
      </div>

      <div className="space-y-5 p-5">
        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جستجوی نام یا کد ملی…"
              className="rounded-xl bg-white pr-10"
            />
          </div>
          {studentsQuery.isError ? (
            <p className="text-sm text-rose-600">
              {audienceError(
                studentsQuery.error,
                "فهرست هنرجوها در دسترس نیست.",
              )}
            </p>
          ) : availableStudents.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              {enrolledIds.size > 0 && !search.trim()
                ? "همه هنرجویان فعال در این دوره هستند."
                : "هنرجویی برای افزودن پیدا نشد."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
              {availableStudents.map((student) => (
                <li
                  key={student.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      className="size-9"
                      avatarUrl={student.avatarUrl}
                      alt={student.displayName}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {student.displayName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {student.nationalId
                          ? `${student.nationalId} · `
                          : ""}
                        سطح {toFa(student.level ?? "1")}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-xl"
                    disabled={enroll.isPending}
                    onClick={() => enroll.mutate(student.id)}
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
            <Users className="mx-auto mb-2 size-8 text-slate-300" />
            هنوز هنرجویی در این دوره نیست.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {enrollments.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar
                    className="size-9"
                    avatarUrl={item.user.avatarUrl}
                    alt={item.user.displayName}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={adminRoutes.user(item.user.id)}
                        className="font-semibold text-slate-900 hover:text-brand"
                      >
                        {item.user.displayName}
                      </Link>
                      <StudentLevelBadge level={item.user.level} />
                      <Badge
                        variant={item.user.isActive ? "success" : "warning"}
                      >
                        {item.user.isActive ? "فعال" : "غیرفعال"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.user.nationalId ? `${item.user.nationalId} · ` : ""}
                      جلسه جاری {toFa(item.currentSessionNumber ?? 1)} · عضویت از{" "}
                      {toFa(
                        new Date(item.joinedAt).toLocaleDateString("fa-IR"),
                      )}
                    </p>
                    {allowedDays.length > 0 ? (
                      <div className="mt-3 max-w-md">
                        <p className="mb-1.5 text-[11px] text-slate-500">
                          روزهای کلاس این هنرجو
                        </p>
                        <WeekdayPicker
                          size="sm"
                          options={allowedDays}
                          value={parseDays(item.classDays, allowedDays.join("، "))}
                          disabled={updateDays.isPending}
                          onChange={(classDays) =>
                            updateDays.mutate({
                              userId: item.user.id,
                              classDays,
                            })
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  disabled={unenroll.isPending}
                  onClick={() => unenroll.mutate(item.user.id)}
                >
                  <Trash2 className="size-3.5" />
                  حذف از دوره
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
