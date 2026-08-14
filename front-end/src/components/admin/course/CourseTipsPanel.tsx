"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AdminConfirmDelete } from "@/components/admin/AdminConfirmDelete";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api/admin-client";
import { adminQueryKeys, useAdminTipsQuery } from "@/lib/api/admin-queries";
import { audienceError } from "@/lib/api/errors";

export function CourseTipsPanel({ courseId }: { courseId: string }) {
  const queryClient = useQueryClient();
  const query = useAdminTipsQuery(courseId);
  const [text, setText] = useState("");

  const create = useMutation({
    mutationFn: () => adminApi.createTip(courseId, { text }),
    onSuccess: async () => {
      setText("");
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.tips(courseId),
      });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteTip(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.tips(courseId),
      });
    },
  });

  if (query.isPending) return <Skeleton className="h-48 rounded-2xl" />;

  if (query.isError) {
    return (
      <p className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {audienceError(query.error, "نکته‌های تمرین الان در دسترس نیستند.")}
      </p>
    );
  }

  return (
    <div dir="rtl" className="space-y-4 text-right">
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="نکته تمرین جدید…"
            className="rounded-xl text-right"
          />
          <Button
            type="button"
            className="rounded-xl"
            disabled={!text.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            افزودن
          </Button>
        </CardContent>
      </Card>
      {create.isError ? (
        <p className="text-sm text-rose-600">
          {audienceError(create.error, "افزودن نکته انجام نشد.")}
        </p>
      ) : null}

      <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
        {(query.data?.tips ?? []).length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">نکته‌ای ثبت نشده.</p>
        ) : (
          (query.data?.tips ?? []).map((tip) => (
            <div
              key={tip.id}
              className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0"
            >
              <p className="min-w-0 flex-1 text-sm text-slate-700">{tip.text}</p>
              <AdminConfirmDelete
                title="حذف نکته؟"
                description="این نکته تمرین حذف می‌شود."
                onConfirm={() => remove.mutate(tip.id)}
              />
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
