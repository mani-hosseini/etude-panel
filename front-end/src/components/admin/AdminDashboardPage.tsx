"use client";

import Link from "next/link";
import { BookOpen, Users, UserCheck, UserCog, UserX } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/http";
import {
  useAdminCoursesQuery,
  useAdminUsersStatsQuery,
} from "@/lib/api/admin-queries";
import { toFa } from "@/lib/format";
import { adminRoutes } from "@/lib/routes";

const cards = [
  { key: "total" as const, label: "کل کاربران", icon: Users },
  { key: "students" as const, label: "هنرجویان", icon: UserCheck },
  { key: "admins" as const, label: "مدیران", icon: UserCog },
  { key: "inactive" as const, label: "غیرفعال", icon: UserX },
];

export function AdminDashboardPage() {
  const statsQuery = useAdminUsersStatsQuery();
  const coursesQuery = useAdminCoursesQuery({ page: 1, limit: 5 });

  if (statsQuery.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (statsQuery.isError) {
    const message =
      statsQuery.error instanceof ApiError
        ? statsQuery.error.message
        : "خطا در دریافت آمار";
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {message}
      </div>
    );
  }

  const stats = statsQuery.data;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium text-brand">کنترل‌پنل اتود</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">صفحه اصلی ادمین</h2>
        <p className="mt-1 text-sm text-slate-500">
          مدیریت دوره‌ها، محتوا و کاربران از یک پنل حرفه‌ای.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className="mt-0.5 font-sans text-2xl font-bold tabular-nums text-slate-900">
                  {toFa(stats[card.key])}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">دوره‌ها</h3>
              <p className="mt-1 text-sm text-slate-500">
                ساخت دوره، جلسه، اسلاید، برنامه و نکات تمرین.
              </p>
            </div>
            <BookOpen className="size-5 text-brand" />
          </div>
          <div className="mt-4 space-y-2">
            {coursesQuery.isPending ? (
              <Skeleton className="h-16 rounded-xl" />
            ) : (
              (coursesQuery.data?.courses ?? []).slice(0, 3).map((c) => (
                <Link
                  key={c.id}
                  href={adminRoutes.course(c.slug)}
                  className="block rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 transition hover:border-brand/30 hover:bg-brand/5"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {c.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {toFa(c.sessionsCount)} جلسه · {toFa(c.enrollmentsCount)}{" "}
                    هنرجو
                  </p>
                </Link>
              ))
            )}
          </div>
          <Link
            href={adminRoutes.courses}
            className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
          >
            مدیریت دوره‌ها
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">کاربران</h3>
              <p className="mt-1 text-sm text-slate-500">
                لیست هنرجویان و فعال/غیرفعال کردن حساب.
              </p>
            </div>
            <Users className="size-5 text-brand" />
          </div>
          <p className="mt-6 text-sm text-slate-600">
            فعال: {toFa(stats.active)} · غیرفعال: {toFa(stats.inactive)}
          </p>
          <Link
            href={adminRoutes.users}
            className="mt-4 inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            مشاهده کاربران
          </Link>
        </div>
      </section>
    </div>
  );
}
