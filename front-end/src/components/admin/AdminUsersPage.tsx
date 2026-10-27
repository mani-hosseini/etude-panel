"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Settings2, X } from "lucide-react";

import { AdminConfirmDelete } from "@/components/admin/AdminConfirmDelete";
import { AdminCreateTeacherForm } from "@/components/admin/AdminCreateTeacherForm";
import { AdminCreateUserForm } from "@/components/admin/AdminCreateUserForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentLevelBadge } from "@/components/ui/student-level-badge";
import { StudentLevelSelect } from "@/components/admin/StudentLevelSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/user-avatar";
import { adminApi } from "@/lib/api/admin-client";
import {
  adminQueryKeys,
  useAdminUsersQuery,
} from "@/lib/api/admin-queries";
import { audienceError } from "@/lib/api/errors";
import { toFa } from "@/lib/format";
import { adminRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type RoleFilter = "ALL" | "STUDENT" | "TEACHER" | "ADMIN";

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [level, setLevel] = useState("all");
  const [teacherId, setTeacherId] = useState("all");
  const [createKind, setCreateKind] = useState<"student" | "teacher" | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      role: role === "ALL" ? undefined : role,
      level: level === "all" ? undefined : level,
      teacherId: teacherId === "all" ? undefined : teacherId,
    }),
    [page, search, role, level, teacherId],
  );

  const query = useAdminUsersQuery(params);
  const teachersQuery = useAdminUsersQuery({ role: "TEACHER", limit: 100 });
  const teachers = teachersQuery.data?.users ?? [];

  const toggleActive = useMutation({
    mutationFn: async (user: { id: string; isActive: boolean }) => {
      if (user.isActive) return adminApi.deactivateUser(user.id);
      return adminApi.activateUser(user.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats });
    },
  });

  const removeUser = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: async () => {
      setDeleteError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats });
    },
    onError: (err) => {
      setDeleteError(audienceError(err, "حذف کاربر انجام نشد."));
    },
  });

  const applySearch = () => {
    setPage(1);
    setSearch(searchDraft.trim());
  };

  const hasActiveFilters =
    level !== "all" || teacherId !== "all" || Boolean(search);
  const clearFilters = () => {
    setLevel("all");
    setTeacherId("all");
    setSearch("");
    setSearchDraft("");
    setPage(1);
  };

  const users = query.data?.users ?? [];
  const meta = query.data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const progressQueries = useQueries({
    queries: users.map((user) => ({
      queryKey: adminQueryKeys.user(user.id),
      queryFn: () => adminApi.user(user.id),
      enabled: user.role === "STUDENT" && user.enrollmentsCount > 0,
      staleTime: 60_000,
    })),
  });

  const progressByUserId = useMemo(() => {
    const map = new Map<string, number>();
    users.forEach((user, index) => {
      map.set(
        user.id,
        progressQueries[index]?.data?.avgProgress ?? user.avgProgress ?? 0,
      );
    });
    return map;
  }, [users, progressQueries]);

  const avatarByUserId = useMemo(() => {
    const map = new Map<string, string | null | undefined>();
    users.forEach((user, index) => {
      map.set(
        user.id,
        progressQueries[index]?.data?.avatarUrl ?? user.avatarUrl,
      );
    });
    return map;
  }, [users, progressQueries]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-brand">مدیریت</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">کاربران</h2>
          <p className="mt-1 text-sm text-slate-500">
            هنرجو، استاد و دسترسی هر کدام به دوره‌ها.
          </p>
        </div>
        {role !== "ADMIN" ? (
          <div className="flex flex-wrap gap-2">
            {role !== "TEACHER" ? (
              <Button
                type="button"
                className="rounded-xl"
                onClick={() =>
                  setCreateKind((current) =>
                    current === "student" ? null : "student",
                  )
                }
              >
                <Plus className="size-4" />
                هنرجوی جدید
              </Button>
            ) : null}
            {role !== "STUDENT" ? (
              <Button
                type="button"
                variant={role === "TEACHER" ? "default" : "outline"}
                className="rounded-xl"
                onClick={() =>
                  setCreateKind((current) =>
                    current === "teacher" ? null : "teacher",
                  )
                }
              >
                <Plus className="size-4" />
                استاد جدید
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {createKind === "student" ? (
        <AdminCreateUserForm onClose={() => setCreateKind(null)} />
      ) : null}
      {createKind === "teacher" ? (
        <AdminCreateTeacherForm onClose={() => setCreateKind(null)} />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "ALL", label: "همه" },
              { id: "STUDENT", label: "هنرجو" },
              { id: "TEACHER", label: "استاد" },
              { id: "ADMIN", label: "ادمین" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setRole(item.id);
                setPage(1);
                if (item.id === "ADMIN" || item.id === "TEACHER") {
                  setLevel("all");
                  setTeacherId("all");
                }
              }}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition",
                role === item.id
                  ? "bg-brand text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-brand/10 hover:text-brand",
              )}
            >
              {item.label}
            </button>
          ))}
          {role === "STUDENT" || role === "ALL" ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-44">
                <Select
                  value={teacherId}
                  onValueChange={(value) => {
                    setTeacherId(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger
                    id="users-teacher-filter"
                    className="rounded-xl bg-white"
                  >
                    <SelectValue placeholder="همه اساتید" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه اساتید</SelectItem>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.displayName}
                        {teacher.title ? ` · ${teacher.title}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <StudentLevelSelect
                  id="users-level-filter"
                  includeAll
                  value={level}
                  onValueChange={(value) => {
                    setLevel(value);
                    setPage(1);
                  }}
                />
              </div>
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={clearFilters}
                >
                  <X className="size-4" />
                  حذف فیلتر
                </Button>
              ) : null}
            </div>
          ) : hasActiveFilters ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={clearFilters}
            >
              <X className="size-4" />
              حذف فیلتر
            </Button>
          ) : null}
        </div>

        <div className="flex w-full gap-2 sm:max-w-sm">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applySearch();
              }}
              placeholder="جستجو نام، کد ملی، تلفن…"
              className="rounded-xl bg-white pe-3 ps-10"
            />
          </div>
          <Button type="button" variant="outline" className="rounded-xl" onClick={applySearch}>
            جستجو
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 text-right font-semibold">نام</th>
                <th className="px-4 py-3 text-right font-semibold">نقش</th>
                <th className="px-4 py-3 text-right font-semibold">سطح / عنوان</th>
                <th className="px-4 py-3 text-right font-semibold">دوره‌ها</th>
                <th className="px-4 py-3 text-right font-semibold">
                  میانگین پیشرفت اسلایدها
                </th>
                <th className="px-4 py-3 text-right font-semibold">وضعیت</th>
                <th className="px-4 py-3 text-right font-semibold">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {query.isPending ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12">
                    <Skeleton className="h-40 rounded-xl" />
                  </td>
                </tr>
              ) : query.isError ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <p className="text-sm text-rose-700">
                      {audienceError(
                        query.error,
                        hasActiveFilters
                          ? "کاربری با این فیلتر پیدا نشد."
                          : "فهرست کاربران الان در دسترس نیست.",
                      )}
                    </p>
                    {hasActiveFilters ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4 rounded-xl"
                        onClick={clearFilters}
                      >
                        <X className="size-4" />
                        حذف فیلتر
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ) : (
                <>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        className="size-8"
                        avatarUrl={avatarByUserId.get(user.id)}
                        alt={user.displayName}
                      />
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900">
                          {user.displayName}
                        </span>
                        {user.nationalId ? (
                          <p
                            className="mt-0.5 font-mono text-[11px] text-slate-400"
                            dir="ltr"
                          >
                            {user.nationalId}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        user.role === "ADMIN" ? "default" : "secondary"
                      }
                    >
                      {user.role === "ADMIN"
                        ? "ادمین"
                        : user.role === "TEACHER"
                          ? "استاد"
                          : "هنرجو"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {user.role === "STUDENT" ? (
                      <StudentLevelBadge level={user.level} />
                    ) : user.role === "TEACHER" ? (
                      <span className="text-xs text-slate-600">
                        {user.title || user.instrument || "استاد"}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-sans tabular-nums">
                    {toFa(
                      user.role === "TEACHER"
                        ? (user.taughtCoursesCount ?? 0)
                        : user.enrollmentsCount,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.role === "STUDENT" ? (
                      <div className="min-w-36 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>میانگین پیشرفت اسلایدها</span>
                          <span className="font-sans font-semibold tabular-nums text-brand">
                            {toFa(progressByUserId.get(user.id) ?? 0)}٪
                          </span>
                        </div>
                        <Progress value={progressByUserId.get(user.id) ?? 0} />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.isActive ? "success" : "warning"}>
                      {user.isActive ? "فعال" : "غیرفعال"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {user.role === "ADMIN" ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          asChild
                        >
                          <Link href={adminRoutes.user(user.id)}>
                            <Settings2 className="size-3.5" />
                            دسترسی
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          disabled={toggleActive.isPending}
                          onClick={() => toggleActive.mutate(user)}
                        >
                          {user.isActive ? "غیرفعال" : "فعال"}
                        </Button>
                        <AdminConfirmDelete
                          title={
                            user.role === "TEACHER" ? "حذف استاد" : "حذف هنرجو"
                          }
                          description={`آیا از حذف «${user.displayName}» مطمئن هستید؟`}
                          disabled={removeUser.isPending}
                          onConfirm={() => removeUser.mutate(user.id)}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    <p>
                      {hasActiveFilters
                        ? "کاربری با این فیلتر پیدا نشد."
                        : "کاربری پیدا نشد."}
                    </p>
                    {hasActiveFilters ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4 rounded-xl"
                        onClick={clearFilters}
                      >
                        <X className="size-4" />
                        حذف فیلتر
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ) : null}
                </>
              )}
            </tbody>
          </table>
        </div>

        {query.isSuccess && meta ? (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <span>
              صفحه {toFa(meta.page)} از {toFa(totalPages)} · جمع{" "}
              {toFa(meta.total)}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl"
                disabled={!meta.hasPrevPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                قبلی
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl"
                disabled={!meta.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                بعدی
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {toggleActive.isError ? (
        <p className="text-sm text-rose-600">
          {audienceError(toggleActive.error, "این تغییر الان انجام نشد.")}
        </p>
      ) : null}
      {deleteError ? (
        <p className="text-sm text-rose-600">{deleteError}</p>
      ) : null}
    </div>
  );
}
