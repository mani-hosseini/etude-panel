"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Settings2 } from "lucide-react";

import { AdminConfirmDelete } from "@/components/admin/AdminConfirmDelete";
import { AdminCreateUserForm } from "@/components/admin/AdminCreateUserForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentLevelBadge } from "@/components/ui/student-level-badge";
import { StudentLevelSelect } from "@/components/admin/StudentLevelSelect";
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

type RoleFilter = "ALL" | "STUDENT" | "ADMIN";

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("STUDENT");
  const [level, setLevel] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      role: role === "ALL" ? undefined : role,
      level: level === "all" ? undefined : level,
    }),
    [page, search, role, level],
  );

  const query = useAdminUsersQuery(params);

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
      setDeleteError(audienceError(err, "حذف هنرجو انجام نشد."));
    },
  });

  const applySearch = () => {
    setPage(1);
    setSearch(searchDraft.trim());
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

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="surface-panel p-8 text-center text-sm text-destructive">
        {audienceError(query.error, "فهرست هنرجوها الان در دسترس نیست.")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-brand">مدیریت</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">کاربران</h2>
          <p className="mt-1 text-sm text-slate-500">
            افزودن هنرجو، حذف و مدیریت دسترسی به دوره‌ها.
          </p>
        </div>
        {role !== "ADMIN" ? (
          <Button
            type="button"
            className="rounded-xl"
            onClick={() => setShowCreate((v) => !v)}
          >
            <Plus className="size-4" />
            هنرجوی جدید
          </Button>
        ) : null}
      </div>

      {showCreate ? (
        <AdminCreateUserForm onClose={() => setShowCreate(false)} />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "STUDENT", label: "هنرجو" },
              { id: "ADMIN", label: "ادمین" },
              { id: "ALL", label: "همه" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setRole(item.id);
                setPage(1);
                if (item.id === "ADMIN") setLevel("all");
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
          {role !== "ADMIN" ? (
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
              placeholder="جستجو نام، ایمیل، کد هنرجو…"
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
                <th className="px-4 py-3 text-right font-semibold">سطح هنرجو</th>
                <th className="px-4 py-3 text-right font-semibold">دوره‌ها</th>
                <th className="px-4 py-3 text-right font-semibold">
                  میانگین پیشرفت اسلایدها
                </th>
                <th className="px-4 py-3 text-right font-semibold">وضعیت</th>
                <th className="px-4 py-3 text-right font-semibold">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        className="size-8"
                        avatarUrl={avatarByUserId.get(user.id)}
                        alt={user.displayName}
                      />
                      <span className="font-semibold text-slate-900">
                        {user.displayName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        user.role === "ADMIN" ? "default" : "secondary"
                      }
                    >
                      {user.role === "ADMIN" ? "ادمین" : "هنرجو"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {user.role === "STUDENT" ? (
                      <StudentLevelBadge level={user.level} />
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-sans tabular-nums">
                    {toFa(user.enrollmentsCount)}
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
                          title="حذف هنرجو"
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
                    کاربری پیدا نشد.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {meta ? (
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
