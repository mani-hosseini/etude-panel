"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Clock3, Headset, Send } from "lucide-react";

import {
  TicketStatusBadge,
  TicketThread,
  UNIT_TONE,
  UnitIcon,
} from "@/components/panel/support/support-ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { adminApi } from "@/lib/api/admin-client";
import {
  adminQueryKeys,
  useAdminSupportTicketQuery,
} from "@/lib/api/admin-queries";
import { audienceError } from "@/lib/api/errors";
import { formatDateTimeFa, formatWaitFa } from "@/lib/format";
import { adminRoutes } from "@/lib/routes";
import { announceSaved } from "@/lib/save-feedback";
import {
  SUPPORT_REPLY_TEMPLATES,
  SUPPORT_UNITS,
} from "@/lib/support-tickets";
import { cn } from "@/lib/utils";

type AdminTicketDetailPageProps = {
  ticketId: string;
};

export function AdminTicketDetailPage({ ticketId }: AdminTicketDetailPageProps) {
  const queryClient = useQueryClient();
  const ticketQuery = useAdminSupportTicketQuery(ticketId);
  const ticket = ticketQuery.data;
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.supportTicket(ticketId),
      }),
      queryClient.invalidateQueries({ queryKey: ["admin", "support"] }),
    ]);

  const reply = useMutation({
    mutationFn: (text: string) => adminApi.replySupportTicket(ticketId, text),
    onSuccess: async () => {
      await invalidate();
      setBody("");
      setError(null);
      const unit = ticket
        ? SUPPORT_UNITS.find((item) => item.id === ticket.unitId)
        : null;
      announceSaved(`پاسخ ${unit?.label ?? "واحد"} برای هنرجو ارسال شد.`, {
        scroll: false,
      });
    },
    onError: (err) => setError(audienceError(err)),
  });

  const updateStatus = useMutation({
    mutationFn: (status: "pending" | "closed") =>
      adminApi.updateSupportTicket(ticketId, status),
    onSuccess: async (_, status) => {
      await invalidate();
      announceSaved(
        status === "closed" ? "تیکت بسته شد." : "تیکت دوباره باز شد.",
        { scroll: false },
      );
    },
    onError: (err) => setError(audienceError(err)),
  });

  if (ticketQuery.isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <Headset className="size-6 text-slate-400" />
        <p className="text-sm font-semibold text-slate-800">این تیکت پیدا نشد</p>
        <Link
          href={adminRoutes.support}
          className="text-sm font-semibold text-brand"
        >
          بازگشت
        </Link>
      </div>
    );
  }

  const unit = SUPPORT_UNITS.find((item) => item.id === ticket.unitId)!;
  const tone = UNIT_TONE[ticket.unitId];
  const closed = ticket.status === "closed";
  const templates = SUPPORT_REPLY_TEMPLATES[ticket.unitId];

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim()) {
      setError("پاسخ را بنویسید.");
      return;
    }
    reply.mutate(body.trim());
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href={adminRoutes.support}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ChevronRight className="size-4" />
        صندوق پشتیبانی
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold",
                tone.chip,
              )}
            >
              {ticket.studentName.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">{ticket.studentName}</p>
              <h2 className="mt-0.5 text-lg font-bold text-slate-900">
                {ticket.title}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <span className={cn("inline-flex items-center gap-1", tone.ink)}>
                  <UnitIcon unitId={ticket.unitId} className="size-3.5" />
                  {unit.staffLabel}
                </span>
                <span>شروع {formatDateTimeFa(ticket.createdAt)}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <TicketStatusBadge status={ticket.status} audience="admin" />
            {ticket.status === "pending" ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-800">
                <Clock3 className="size-3.5" />
                {formatWaitFa(ticket.updatedAt)}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <TicketThread ticket={ticket} studentLabel={ticket.studentName} />

      {closed ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-slate-100 px-4 py-4 text-center">
          <p className="text-sm text-slate-600">این تیکت بسته شده است.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updateStatus.mutate("pending")}
            disabled={updateStatus.isPending}
          >
            بازگشایی
          </Button>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
        >
          <p className="text-sm font-medium text-slate-800">
            پاسخ به‌عنوان {unit.staffLabel}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {templates.map((template) => (
              <button
                key={template}
                type="button"
                onClick={() => {
                  setBody(template);
                  setError(null);
                }}
                className="rounded-full bg-slate-50 px-3 py-1 text-[11px] text-slate-600 ring-1 ring-slate-200 hover:bg-brand-50 hover:text-brand-700"
              >
                {template}
              </button>
            ))}
          </div>
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="min-h-28"
            placeholder={`جواب ${ticket.studentName} را بنویسید…`}
          />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={reply.isPending}>
              <Send className="size-4" />
              {reply.isPending ? "در حال ارسال…" : "ارسال پاسخ"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => updateStatus.mutate("closed")}
              disabled={updateStatus.isPending}
            >
              بستن تیکت
            </Button>
          </div>
          <p className="text-[11px] text-slate-400">
            بعد از ارسال، هنرجو در پنل خودش نوتیف می‌بیند.
          </p>
        </form>
      )}
    </div>
  );
}
