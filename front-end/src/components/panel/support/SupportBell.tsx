"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { UNIT_TONE, UnitIcon } from "@/components/panel/support/support-ui";
import { useSupportTicketsQuery } from "@/lib/api/queries";
import { formatRelativeFa, toFa } from "@/lib/format";
import { routes } from "@/lib/routes";
import {
  SUPPORT_UNITS,
  lastMessage,
  unreadStudentTickets,
} from "@/lib/support-tickets";
import { cn } from "@/lib/utils";

export function SupportBell() {
  const tickets = useSupportTicketsQuery().data ?? [];
  const unread = unreadStudentTickets(tickets);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex size-10 items-center justify-center rounded-xl border border-border bg-white text-navy shadow-sm"
        aria-label="اعلان‌های پشتیبانی"
      >
        <Bell className="size-4" strokeWidth={1.75} />
        {unread.length > 0 ? (
          <span className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {toFa(unread.length)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-white shadow-lift">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <p className="text-sm font-semibold text-navy">پاسخ واحدها</p>
            <span className="text-[11px] text-muted-foreground">
              {unread.length > 0
                ? `${toFa(unread.length)} پاسخ جدید`
                : "پیام تازه‌ای نیست"}
            </span>
          </div>
          {unread.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              وقتی واحدی جواب بدهد، اینجا می‌آید.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {unread.slice(0, 6).map((ticket) => {
                const unit = SUPPORT_UNITS.find(
                  (item) => item.id === ticket.unitId,
                )!;
                const preview = lastMessage(ticket);
                return (
                  <li key={ticket.id}>
                    <Link
                      href={routes.supportTicket(ticket.id)}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-3 py-3 hover:bg-slate-50"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                          UNIT_TONE[ticket.unitId].icon,
                        )}
                      >
                        <UnitIcon unitId={ticket.unitId} className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-navy">
                          {unit.staffLabel} پاسخ داد
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {ticket.title}
                          {preview?.body ? ` · ${preview.body}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatRelativeFa(ticket.updatedAt)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            href={routes.support}
            onClick={() => setOpen(false)}
            className="block border-t border-border px-3 py-2.5 text-center text-xs font-semibold text-brand"
          >
            همه تیکت‌ها
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function SupportReplyBanner() {
  const tickets = useSupportTicketsQuery().data ?? [];
  const unread = unreadStudentTickets(tickets);
  if (unread.length === 0) return null;
  const first = unread[0]!;
  const unit = SUPPORT_UNITS.find((item) => item.id === first.unitId)!;

  return (
    <Link
      href={
        unread.length === 1
          ? routes.supportTicket(first.id)
          : routes.support
      }
      className="flex items-center justify-between gap-3 rounded-2xl border border-brand/20 bg-brand-50 px-4 py-3 text-sm text-brand-800"
    >
      <span className="min-w-0 truncate">
        {unread.length === 1
          ? `${unit.staffLabel} به «${first.title}» پاسخ داد.`
          : `${toFa(unread.length)} پاسخ جدید از واحدها رسیده است.`}
      </span>
      <span className="shrink-0 font-semibold">مشاهده</span>
    </Link>
  );
}
