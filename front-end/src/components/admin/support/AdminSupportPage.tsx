"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clock3, Headset, Search } from "lucide-react";

import {
  FilterPill,
  TicketStatusBadge,
  UNIT_TONE,
  UnitIcon,
} from "@/components/panel/support/support-ui";
import { Input } from "@/components/ui/input";
import {
  useAdminSupportStatsQuery,
  useAdminSupportTicketsQuery,
} from "@/lib/api/admin-queries";
import { formatRelativeFa, formatWaitFa, toFa } from "@/lib/format";
import { adminRoutes } from "@/lib/routes";
import {
  SUPPORT_UNITS,
  lastMessage,
  sortTickets,
  ticketMatchesQuery,
  type SupportUnitId,
  type TicketStatus,
} from "@/lib/support-tickets";
import { cn } from "@/lib/utils";

type UnitFilter = "all" | SupportUnitId;
type StatusFilter = "all" | TicketStatus;

export function AdminSupportPage() {
  const tickets = useAdminSupportTicketsQuery().data ?? [];
  const remoteStats = useAdminSupportStatsQuery().data;
  const [unitFilter, setUnitFilter] = useState<UnitFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [query, setQuery] = useState("");

  const stats = useMemo(() => {
    const pendingCount = remoteStats?.pending ?? 0;
    const repliedCount = remoteStats?.replied ?? 0;
    const closedCount = remoteStats?.closed ?? 0;
    const avgWait = remoteStats?.avgWaitMinutes ?? 0;
    const byUnit =
      remoteStats?.pendingByUnit ??
      (Object.fromEntries(SUPPORT_UNITS.map((unit) => [unit.id, 0])) as Record<
        SupportUnitId,
        number
      >);
    return {
      pendingCount,
      repliedCount,
      closedCount,
      avgWait,
      byUnit,
    };
  }, [remoteStats]);

  const visible = sortTickets(
    tickets.filter((ticket) => {
      if (unitFilter !== "all" && ticket.unitId !== unitFilter) return false;
      if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
      return ticketMatchesQuery(ticket, query);
    }),
  );

  const avgWaitLabel =
    stats.avgWait < 60
      ? `${toFa(stats.avgWait)} دقیقه`
      : `${toFa(Math.round(stats.avgWait / 60))} ساعت`;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          صندوق پشتیبانی
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          هر تیکت مال یک واحد است. اول آن‌هایی را ببینید که منتظر پاسخ‌اند.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          {
            label: "نیاز به پاسخ",
            value: toFa(stats.pendingCount),
            hint: "صف انتظار",
          },
          {
            label: "پاسخ داده شد",
            value: toFa(stats.repliedCount),
            hint: "منتظر هنرجو",
          },
          {
            label: "بسته",
            value: toFa(stats.closedCount),
            hint: "تمام‌شده",
          },
          {
            label: "میانگین انتظار",
            value: stats.pendingCount === 0 ? "—" : avgWaitLabel,
            hint: "تیکت‌های باز",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
          >
            <p className="text-[11px] text-slate-500">{item.label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
              {item.value}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">{item.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {SUPPORT_UNITS.map((unit) => {
          const tone = UNIT_TONE[unit.id];
          const active = unitFilter === unit.id;
          return (
            <button
              key={unit.id}
              type="button"
              onClick={() =>
                setUnitFilter((current) =>
                  current === unit.id ? "all" : unit.id,
                )
              }
              className={cn(
                "flex items-center gap-3 rounded-2xl border bg-white p-3 text-right transition",
                active
                  ? `border-transparent ring-2 ${tone.ring}`
                  : "border-slate-200 hover:border-brand/30",
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  tone.icon,
                )}
              >
                <UnitIcon unitId={unit.id} className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{unit.label}</span>
                  {stats.byUnit[unit.id] > 0 ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                      {toFa(stats.byUnit[unit.id])}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                  {unit.short}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جستجو با نام هنرجو، عنوان یا متن"
            className="h-10 pr-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["pending", "نیاز به پاسخ"],
              ["replied", "پاسخ داده شد"],
              ["closed", "بسته"],
              ["all", "همه"],
            ] as const
          ).map(([id, label]) => (
            <FilterPill
              key={id}
              active={statusFilter === id}
              onClick={() => setStatusFilter(id)}
            >
              {label}
            </FilterPill>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
          <Headset className="size-6 text-slate-400" />
          <p className="text-sm font-semibold text-slate-800">
            تیکتی در این فیلتر نیست
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {visible.map((ticket, index) => {
            const unit = SUPPORT_UNITS.find((item) => item.id === ticket.unitId)!;
            const preview = lastMessage(ticket);
            const waiting = ticket.status === "pending";
            return (
              <Link
                key={ticket.id}
                href={adminRoutes.supportTicket(ticket.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50",
                  index > 0 ? "border-t border-slate-100" : "",
                  waiting ? "bg-amber-50/40" : "",
                )}
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold",
                    UNIT_TONE[ticket.unitId].chip,
                  )}
                >
                  {ticket.studentName.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {ticket.studentName}
                    </p>
                    <span className="text-[11px] text-slate-400">
                      {unit.label}
                    </span>
                    <TicketStatusBadge status={ticket.status} audience="admin" />
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-800">
                    {ticket.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {preview?.author === "student" ? "هنرجو: " : `${unit.staffLabel}: `}
                    {preview?.body}
                  </p>
                </div>
                <span className="hidden shrink-0 items-center gap-1 text-[11px] text-slate-500 sm:flex">
                  {waiting ? (
                    <>
                      <Clock3 className="size-3.5" />
                      {formatWaitFa(ticket.updatedAt)}
                    </>
                  ) : (
                    formatRelativeFa(ticket.updatedAt)
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
