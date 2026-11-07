"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Headset, Plus, Search } from "lucide-react";

import { SupportReplyBanner } from "@/components/panel/support/SupportBell";
import {
  FilterPill,
  TicketStatusBadge,
  UNIT_TONE,
  UnitIcon,
} from "@/components/panel/support/support-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSupportTicketsQuery } from "@/lib/api/queries";
import { formatRelativeFa, toFa } from "@/lib/format";
import { routes } from "@/lib/routes";
import {
  SUPPORT_UNITS,
  lastMessage,
  sortTickets,
  ticketMatchesQuery,
  unreadStudentTickets,
  type SupportUnitId,
  type TicketStatus,
} from "@/lib/support-tickets";
import { cn } from "@/lib/utils";

type UnitFilter = "all" | SupportUnitId;
type StatusFilter = "all" | TicketStatus | "unread";

export function SupportPage() {
  const ticketsQuery = useSupportTicketsQuery();
  const tickets = ticketsQuery.data ?? [];
  const [unitFilter, setUnitFilter] = useState<UnitFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const unread = unreadStudentTickets(tickets);

  const openByUnit = useMemo(() => {
    const counts = Object.fromEntries(
      SUPPORT_UNITS.map((unit) => [unit.id, 0]),
    ) as Record<SupportUnitId, number>;
    for (const ticket of tickets) {
      if (ticket.unreadForStudent) counts[ticket.unitId] += 1;
    }
    return counts;
  }, [tickets]);

  const visible = sortTickets(
    tickets.filter((ticket) => {
      if (unitFilter !== "all" && ticket.unitId !== unitFilter) return false;
      if (statusFilter === "unread") return ticket.unreadForStudent;
      if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
      return ticketMatchesQuery(ticket, query);
    }),
    "student",
  );
  const selectedUnit = unitFilter === "all" ? undefined : unitFilter;

  return (
    <div className="space-y-5 pb-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-navy sm:text-2xl">پشتیبانی</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            موضوع را برای واحد خودش بفرستید.
          </p>
        </div>
        <Button asChild>
          <Link href={routes.supportNew(selectedUnit)}>
            <Plus className="size-4" />
            تیکت جدید
          </Link>
        </Button>
      </div>

      <SupportReplyBanner />

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
                  : "border-border hover:border-brand/25",
              )}
            >
              <span
                className={cn(
                  "relative flex size-10 shrink-0 items-center justify-center rounded-xl",
                  tone.icon,
                )}
              >
                <UnitIcon unitId={unit.id} className="size-5" />
                {openByUnit[unit.id] > 0 ? (
                  <span className="absolute -top-1 -left-1 size-2 rounded-full bg-rose-500 ring-2 ring-white" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-navy">
                    {unit.label}
                  </span>
                  {openByUnit[unit.id] > 0 ? (
                    <span className="text-[11px] font-semibold tabular-nums text-rose-600">
                      {toFa(openByUnit[unit.id])}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
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
            placeholder="جستجو در تیکت‌ها"
            className="h-10 pr-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "همه"],
              ["unread", `پاسخ جدید${unread.length ? ` ${toFa(unread.length)}` : ""}`],
              ["pending", "باز"],
              ["replied", "پاسخ واحد"],
              ["closed", "بسته"],
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
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
          <Headset className="size-6 text-brand" />
          <p className="text-sm font-semibold text-navy">تیکتی اینجا نیست</p>
          <Button asChild size="sm">
            <Link href={routes.supportNew(selectedUnit)}>تیکت جدید</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-white">
          {visible.map((ticket, index) => {
            const unit = SUPPORT_UNITS.find((item) => item.id === ticket.unitId)!;
            const preview = lastMessage(ticket);
            return (
              <Link
                key={ticket.id}
                href={routes.supportTicket(ticket.id)}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50",
                  index > 0 ? "border-t border-border" : "",
                  ticket.unreadForStudent ? "bg-brand-50/70" : "",
                )}
              >
                <span
                  className={cn(
                    "size-2.5 shrink-0 rounded-full",
                    ticket.unreadForStudent
                      ? "bg-rose-500"
                      : UNIT_TONE[ticket.unitId].bar,
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className={cn(
                        "truncate text-sm text-navy",
                        ticket.unreadForStudent ? "font-bold" : "font-semibold",
                      )}
                    >
                      {ticket.title}
                    </h3>
                    {ticket.unreadForStudent ? (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                        پاسخ جدید
                      </span>
                    ) : (
                      <TicketStatusBadge status={ticket.status} />
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {unit.label}
                    {" · "}
                    {preview?.author === "staff" ? `${unit.staffLabel}: ` : ""}
                    {preview?.body}
                  </p>
                </div>
                <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:block">
                  {formatRelativeFa(ticket.updatedAt)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
