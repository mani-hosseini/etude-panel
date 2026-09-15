"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Plus, Search } from "lucide-react";

import { AdminConfirmDelete } from "@/components/admin/AdminConfirmDelete";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ExamStatusBadge } from "@/components/exams/ExamStatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api/admin-client";
import { useAdminExamsQuery } from "@/lib/api/admin-queries";
import { audienceError } from "@/lib/api/errors";
import { toFa } from "@/lib/format";
import { adminRoutes } from "@/lib/routes";

export function AdminExamsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");

  const params = useMemo(
    () => ({ page, limit: 20, search: search || undefined }),
    [page, search],
  );
  const query = useAdminExamsQuery(params);

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteExam(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "exams"] });
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
        {audienceError(query.error, "فهرست آزمون‌ها الان در دسترس نیست.")}
      </Card>
    );
  }

  const { exams, meta } = query.data;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="ارزیابی هنرجویان"
        title="آزمون‌ها"
        description="پاسخ‌نامه و برگه سوالات را جداگانه آپلود کنید؛ نمره هر هنرجو را از ۱۰۰ در جزئیات آزمون وارد کنید."
        actions={
          <Button asChild className="rounded-xl">
            <Link href={adminRoutes.examNew}>
              <Plus className="size-4" />
              آزمون جدید
            </Link>
          </Button>
        }
      />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setPage(1);
                setSearch(searchDraft.trim());
              }
            }}
            placeholder="جستجو عنوان آزمون…"
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

      <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
        {exams.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <ClipboardCheck className="size-10 text-slate-300" />
            <p className="text-sm text-slate-500">هنوز آزمونی ثبت نشده.</p>
            <Button asChild className="rounded-xl">
              <Link href={adminRoutes.examNew}>ایجاد اولین آزمون</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">عنوان</th>
                  <th className="px-4 py-3 font-medium">وضعیت</th>
                  <th className="px-4 py-3 font-medium">ارسال‌ها</th>
                  <th className="px-4 py-3 font-medium">اقدام</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <Link
                        href={adminRoutes.exam(exam.id)}
                        className="font-semibold text-slate-900 hover:text-brand"
                      >
                        {exam.title}
                      </Link>
                      {exam.description ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                          {exam.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <ExamStatusBadge status={exam.status} />
                    </td>
                    <td className="px-4 py-3 font-sans tabular-nums text-slate-700">
                      {toFa(exam.submissionsCount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="outline" size="sm" className="rounded-xl">
                          <Link href={adminRoutes.exam(exam.id)}>مدیریت</Link>
                        </Button>
                        <AdminConfirmDelete
                          title="حذف آزمون"
                          description="برگه، پاسخ‌نامه و تمام PDFهای ارسال‌شده حذف می‌شوند."
                          onConfirm={() => remove.mutate(exam.id)}
                          disabled={remove.isPending}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            قبلی
          </Button>
          <span className="text-sm text-slate-500">
            {toFa(page)} از {toFa(totalPages)}
          </span>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            بعدی
          </Button>
        </div>
      ) : null}
    </div>
  );
}
