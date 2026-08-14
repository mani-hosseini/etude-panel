"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminApi,
  type AdminCourseDetail,
  type CourseStatus,
  type UpsertCourseBody,
} from "@/lib/api/admin-client";
import { adminQueryKeys, useAdminCourseQuery } from "@/lib/api/admin-queries";
import { audienceError } from "@/lib/api/errors";
import { adminRoutes } from "@/lib/routes";

const emptyForm: UpsertCourseBody = {
  title: "",
  subtitle: "",
  instrument: "تئوری موسیقی",
  teacher: "",
  teacherShort: "",
  day: "شنبه",
  time: "۱۰:۰۰ تا ۱۱:۳۰",
  timeShort: "۱۰:۰۰",
  duration: "۹۰ دقیقه",
  room: "کلاس آنلاین",
  level: "مقدماتی",
  focus: "",
  sessionsTotal: 12,
  weeklyHours: 2,
  status: "ACTIVE",
  certificateReady: false,
  accessNote: "",
  isActive: true,
  sortOrder: 0,
};

type Props = {
  courseId?: string;
};

export function AdminCourseFormPage({ courseId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(courseId);
  const courseQuery = useAdminCourseQuery(courseId ?? "");
  const [form, setForm] = useState<UpsertCourseBody>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseQuery.data) return;
    const c = courseQuery.data;
    setForm({
      slug: c.slug,
      title: c.title,
      subtitle: c.subtitle,
      instrument: c.instrument,
      teacher: c.teacher,
      teacherShort: c.teacherShort,
      day: c.day,
      time: c.time,
      timeShort: c.timeShort,
      duration: c.duration,
      room: c.room,
      level: c.level,
      focus: c.focus,
      sessionsTotal: c.sessionsTotal,
      weeklyHours: c.weeklyHours,
      status: c.status,
      certificateReady: c.certificateReady,
      accessNote: c.accessNote ?? "",
      isActive: c.isActive,
      sortOrder: c.sortOrder,
    });
  }, [courseQuery.data]);

  const save = useMutation({
    mutationFn: async () => {
      const body: UpsertCourseBody = {
        ...form,
        accessNote: form.accessNote || undefined,
        slug: form.slug || undefined,
      };
      if (isEdit) {
        const id = courseQuery.data?.id;
        if (!id) throw new Error("شناسه دوره یافت نشد.");
        return adminApi.updateCourse(id, body);
      }
      return adminApi.createCourse(body);
    },
    onSuccess: async (course: AdminCourseDetail) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.course(course.id),
      });
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.course(course.slug),
      });
      router.push(adminRoutes.course(course.slug));
    },
    onError: (err) => {
      setError(audienceError(err, "ذخیره دوره انجام نشد."));
    },
  });

  if (isEdit && courseQuery.isPending) {
    return <Skeleton className="h-96 rounded-2xl" />;
  }

  if (isEdit && courseQuery.isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {audienceError(courseQuery.error, "دوره یافت نشد.")}
      </div>
    );
  }

  const set =
    (key: keyof UpsertCourseBody) =>
    (value: string | number | boolean) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader
        eyebrow={isEdit ? "ویرایش دوره" : "ایجاد دوره"}
        title={isEdit ? form.title || "ویرایش" : "دوره جدید"}
        backHref={
          isEdit && courseId
            ? adminRoutes.course(
                courseQuery.data?.slug ?? String(courseId),
              )
            : adminRoutes.courses
        }
        backLabel="بازگشت"
      />

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-5 sm:p-6">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          save.mutate();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="عنوان دوره">
            <Input
              required
              value={form.title}
              onChange={(e) => set("title")(e.target.value)}
              className="rounded-xl"
            />
          </Field>
          <Field label="اسلاگ (اختیاری)">
            <Input
              dir="ltr"
              className="rounded-xl text-left"
              value={form.slug ?? ""}
              onChange={(e) => set("slug")(e.target.value)}
              placeholder="theory-basics"
            />
          </Field>
          <Field label="زیرعنوان" className="sm:col-span-2">
            <Input
              required
              value={form.subtitle}
              onChange={(e) => set("subtitle")(e.target.value)}
              className="rounded-xl"
            />
          </Field>
          <Field label="ساز / حوزه">
            <Input
              required
              value={form.instrument}
              onChange={(e) => set("instrument")(e.target.value)}
              className="rounded-xl"
            />
          </Field>
          <Field label="سطح">
            <Input
              required
              value={form.level}
              onChange={(e) => set("level")(e.target.value)}
              className="rounded-xl"
            />
          </Field>
          <Field label="استاد">
            <Input
              required
              value={form.teacher}
              onChange={(e) => set("teacher")(e.target.value)}
              className="rounded-xl"
            />
          </Field>
          <Field label="نام کوتاه استاد">
            <Input
              required
              value={form.teacherShort}
              onChange={(e) => set("teacherShort")(e.target.value)}
              className="rounded-xl"
            />
          </Field>
          <Field label="روز">
            <Input
              required
              value={form.day}
              onChange={(e) => set("day")(e.target.value)}
              className="rounded-xl"
            />
          </Field>
          <Field label="ساعت کوتاه">
            <Input
              required
              value={form.timeShort}
              onChange={(e) => set("timeShort")(e.target.value)}
              className="rounded-xl"
            />
          </Field>
          <Field label="بازه زمانی" className="sm:col-span-2">
            <Input
              required
              value={form.time}
              onChange={(e) => set("time")(e.target.value)}
              className="rounded-xl"
            />
          </Field>
          <Field label="مدت جلسه">
            <Input
              required
              value={form.duration}
              onChange={(e) => set("duration")(e.target.value)}
              className="rounded-xl"
            />
          </Field>
          <Field label="کلاس / مکان">
            <Input
              required
              value={form.room}
              onChange={(e) => set("room")(e.target.value)}
              className="rounded-xl"
            />
          </Field>
          <Field label="تمرکز دوره" className="sm:col-span-2">
            <Input
              required
              value={form.focus}
              onChange={(e) => set("focus")(e.target.value)}
              className="rounded-xl"
            />
          </Field>
          <Field label="تعداد جلسات">
            <Input
              required
              type="number"
              min={1}
              value={form.sessionsTotal}
              onChange={(e) => set("sessionsTotal")(Number(e.target.value))}
              className="rounded-xl"
              disabled={isEdit}
            />
          </Field>
          <Field label="ساعات هفتگی">
            <Input
              type="number"
              min={0}
              value={form.weeklyHours ?? 2}
              onChange={(e) => set("weeklyHours")(Number(e.target.value))}
              className="rounded-xl"
            />
          </Field>
          <Field label="وضعیت">
            <Select
              value={form.status}
              onValueChange={(value) => set("status")(value as CourseStatus)}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">فعال</SelectItem>
                <SelectItem value="UPCOMING">به‌زودی</SelectItem>
                <SelectItem value="COMPLETED">پایان‌یافته</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="ترتیب نمایش">
            <Input
              type="number"
              value={form.sortOrder ?? 0}
              onChange={(e) => set("sortOrder")(Number(e.target.value))}
              className="rounded-xl"
            />
          </Field>
          <Field label="یادداشت دسترسی" className="sm:col-span-2">
            <Input
              value={form.accessNote ?? ""}
              onChange={(e) => set("accessNote")(e.target.value)}
              className="rounded-xl"
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(form.isActive)}
              onChange={(e) => set("isActive")(e.target.checked)}
            />
            دوره فعال باشد
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(form.certificateReady)}
              onChange={(e) => set("certificateReady")(e.target.checked)}
            />
            گواهی آماده است
          </label>
        </div>

        {error ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="rounded-xl" disabled={save.isPending}>
            {save.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                در حال ذخیره…
              </>
            ) : isEdit ? (
              "ذخیره تغییرات"
            ) : (
              "ایجاد دوره"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() =>
              router.push(
                isEdit && courseId
                  ? adminRoutes.course(
                      courseQuery.data?.slug ?? String(courseId),
                    )
                  : adminRoutes.courses,
              )
            }
          >
            انصراف
          </Button>
        </div>
      </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className ? `space-y-2 ${className}` : "space-y-2"}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
