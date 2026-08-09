"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { AdminConfirmDelete } from "@/components/admin/AdminConfirmDelete";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi, type LessonStatus, type LessonType } from "@/lib/api/admin-client";
import {
  adminQueryKeys,
  useAdminScheduleQuery,
} from "@/lib/api/admin-queries";

const fields = [
  ["title", "عنوان"],
  ["teacher", "استاد"],
  ["day", "روز"],
  ["dateLabel", "تاریخ"],
  ["time", "ساعت"],
  ["room", "مکان"],
  ["duration", "مدت"],
] as const;

export function CourseSchedulePanel({ courseId }: { courseId: string }) {
  const queryClient = useQueryClient();
  const query = useAdminScheduleQuery(courseId);
  const [form, setForm] = useState({
    title: "",
    teacher: "",
    day: "شنبه",
    dateLabel: "",
    time: "",
    room: "",
    duration: "۹۰ دقیقه",
    type: "THEORY" as LessonType,
    status: "PLANNED" as LessonStatus,
  });

  const create = useMutation({
    mutationFn: () => adminApi.createSchedule(courseId, form),
    onSuccess: async () => {
      setForm((f) => ({ ...f, title: "", dateLabel: "", time: "" }));
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.schedule(courseId),
      });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteSchedule(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.schedule(courseId),
      });
    },
  });

  if (query.isPending) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div dir="rtl" className="space-y-4 text-right">
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
          {fields.map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              <Input
                required
                className="rounded-xl text-right"
                value={form[key]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [key]: e.target.value }))
                }
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <Button
              type="button"
              className="rounded-xl"
              disabled={create.isPending}
              onClick={() => create.mutate()}
            >
              <Plus className="size-4" />
              افزودن به برنامه
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
        {(query.data?.lessons ?? []).length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">برنامه خالی است.</p>
        ) : (
          (query.data?.lessons ?? []).map((lesson) => (
            <div
              key={lesson.id}
              className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0"
            >
              <div className="min-w-0 text-right">
                <p className="text-sm font-semibold text-slate-900">{lesson.title}</p>
                <p className="text-xs text-slate-500">
                  {lesson.day} · {lesson.dateLabel} · {lesson.time} · {lesson.room}
                </p>
              </div>
              <AdminConfirmDelete
                title="حذف از برنامه؟"
                description="این آیتم از برنامه کلاس حذف می‌شود."
                onConfirm={() => remove.mutate(lesson.id)}
              />
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
