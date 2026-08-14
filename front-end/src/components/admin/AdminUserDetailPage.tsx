"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Eye, EyeOff, Plus, Save, Trash2 } from "lucide-react";

import { AdminConfirmDelete } from "@/components/admin/AdminConfirmDelete";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { UserAvatar } from "@/components/ui/user-avatar";
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

function AdminUserEditForm({
  user,
  onSaved,
}: {
  user: NonNullable<ReturnType<typeof useAdminUserQuery>["data"]>;
  onSaved: () => Promise<void>;
}) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [level, setLevel] = useState(user.level ?? "");
  const [studentCode, setStudentCode] = useState(user.studentCode ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [nationalId, setNationalId] = useState(user.nationalId ?? "");
  const [address, setAddress] = useState(user.address ?? "");
  const [password, setPassword] = useState(user.password ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const isStudent = user.role === "STUDENT";

  const saveUser = useMutation({
    mutationFn: () =>
      adminApi.updateUser(user.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        level: level.trim() || undefined,
        studentCode: studentCode.trim() || undefined,
        phone: phone.trim(),
        nationalId: nationalId.trim(),
        address: address.trim(),
        ...(password.trim() ? { password: password.trim() } : {}),
      }),
    onSuccess: async (updated) => {
      setActionError(null);
      setActionSuccess("اطلاعات کاربر ذخیره شد.");
      if (updated.password) setPassword(updated.password);
      await onSaved();
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(
        err instanceof ApiError ? err.message : "ذخیره کاربر ناموفق بود.",
      );
    },
  });

  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-900">ویرایش کاربر</h3>
        <p className="mt-1 text-xs text-slate-500">
          اطلاعات و رمز عبور کاربر را ببینید و تغییر دهید
        </p>
      </div>
      <form
        className="space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setActionSuccess(null);
          setActionError(null);
          saveUser.mutate();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="admin-firstName">نام</Label>
            <Input
              id="admin-firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-lastName">نام خانوادگی</Label>
            <Input
              id="admin-lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>
          {isStudent ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="admin-level">سطح</Label>
                <Input
                  id="admin-level"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-code">کد هنرجو</Label>
                <Input
                  id="admin-code"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-phone">شماره تلفن</Label>
                <Input
                  id="admin-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-xl"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-nationalId">کد ملی</Label>
                <Input
                  id="admin-nationalId"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="rounded-xl"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="admin-address">آدرس</Label>
                <Input
                  id="admin-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </>
          ) : null}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="admin-password">رمز عبور</Label>
            <div className="flex gap-2">
              <Input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl"
                placeholder={
                  user.password
                    ? "رمز فعلی نمایش داده شده — برای تغییر ویرایش کنید"
                    : "رمز عبور جدید (حداقل ۸ کاراکتر)"
                }
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 rounded-xl"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "مخفی کردن رمز" : "نمایش رمز"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
            {!user.password ? (
              <p className="text-[11px] text-slate-500">
                رمز قبلی در سیستم ذخیره نشده؛ با ذخیره، رمز جدید ثبت می‌شود.
              </p>
            ) : null}
          </div>
        </div>
        {actionError ? (
          <p className="text-sm text-rose-600">{actionError}</p>
        ) : null}
        {actionSuccess ? (
          <p className="text-sm text-emerald-600">{actionSuccess}</p>
        ) : null}
        <Button
          type="submit"
          className="rounded-xl"
          disabled={saveUser.isPending}
        >
          <Save className="size-4" />
          {saveUser.isPending ? "در حال ذخیره…" : "ذخیره تغییرات"}
        </Button>
      </form>
    </Card>
  );
}

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
        <div className="mb-4 flex items-center gap-3">
          <UserAvatar
            className="size-12"
            avatarUrl={user.avatarUrl}
            alt={user.displayName}
          />
          <div>
            <p className="font-semibold text-slate-900">{user.displayName}</p>
            <p className="text-xs text-slate-500">
              {isStudent ? (user.studentCode ?? "هنرجو") : (user.email ?? "ادمین")}
            </p>
          </div>
        </div>
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
        {isStudent ? (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>میانگین پیشرفت اسلایدها</span>
              <span className="font-sans font-semibold tabular-nums text-brand">
                {toFa(user.avgProgress ?? 0)}٪
              </span>
            </div>
            <Progress value={user.avgProgress ?? 0} />
          </div>
        ) : null}
      </Card>

      <AdminUserEditForm
        key={`${user.id}-${user.updatedAt}`}
        user={user}
        onSaved={invalidate}
      />

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
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">
                        {item.course.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.course.teacher} · {item.course.instrument}
                      </p>
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
