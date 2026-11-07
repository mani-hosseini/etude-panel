"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Headset, Send } from "lucide-react";

import {
  TicketStatusBadge,
  TicketThread,
  UNIT_TONE,
  UnitIcon,
} from "@/components/panel/support/support-ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { audienceError } from "@/lib/api/errors";
import { queryKeys, useSupportTicketQuery } from "@/lib/api/queries";
import { routes } from "@/lib/routes";
import { announceSaved } from "@/lib/save-feedback";
import {
  SUPPORT_UNITS,
  TICKET_STATUS_COPY,
  lastMessage,
} from "@/lib/support-tickets";
import { cn } from "@/lib/utils";

type TicketDetailPageProps = {
  ticketId: string;
};

export function TicketDetailPage({ ticketId }: TicketDetailPageProps) {
  const queryClient = useQueryClient();
  const ticketQuery = useSupportTicketQuery(ticketId);
  const ticket = ticketQuery.data;
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const seenRef = useRef<string | null>(null);

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.supportTickets }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.supportTicket(ticketId),
      }),
    ]);

  useEffect(() => {
    if (!ticket?.unreadForStudent) return;
    if (seenRef.current === ticket.id) return;
    seenRef.current = ticket.id;
    void api.markSupportTicketSeen(ticket.id).then(() => invalidate());
  }, [ticket?.id, ticket?.unreadForStudent]);

  const reply = useMutation({
    mutationFn: (text: string) => api.replySupportTicket(ticketId, text),
    onSuccess: async () => {
      await invalidate();
      setBody("");
      setError(null);
      announceSaved("ارسال شد.", { scroll: false });
    },
    onError: (err) => setError(audienceError(err)),
  });

  if (ticketQuery.isPending) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
        <Headset className="size-6 text-brand" />
        <p className="text-sm font-semibold text-navy">این تیکت پیدا نشد</p>
        <Link href={routes.support} className="text-sm font-semibold text-brand">
          بازگشت
        </Link>
      </div>
    );
  }

  const unit = SUPPORT_UNITS.find((item) => item.id === ticket.unitId)!;
  const tone = UNIT_TONE[ticket.unitId];
  const closed = ticket.status === "closed";

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim()) {
      setError("متن را بنویسید.");
      return;
    }
    reply.mutate(body.trim());
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href={routes.support}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy"
      >
        <ChevronRight className="size-4" />
        پشتیبانی
      </Link>

      <section className="rounded-2xl border border-border bg-white p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              tone.icon,
            )}
          >
            <UnitIcon unitId={ticket.unitId} className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn("text-xs font-medium", tone.ink)}>{unit.label}</p>
            <h2 className="mt-0.5 text-lg font-bold text-navy">{ticket.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {TICKET_STATUS_COPY[ticket.status].hint}
            </p>
          </div>
          <TicketStatusBadge status={ticket.status} />
        </div>
        {lastMessage(ticket)?.author === "staff" ? (
          <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-800">
            آخرین پاسخ از {unit.staffLabel} است.
          </p>
        ) : null}
      </section>

      <TicketThread ticket={ticket} studentLabel="شما" />

      {closed ? (
        <p className="rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm text-slate-600">
          این تیکت بسته شده است.
        </p>
      ) : (
        <form
          onSubmit={submit}
          className="space-y-3 rounded-2xl border border-border bg-white p-4"
        >
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="min-h-24"
            placeholder={`پیام برای ${unit.label}…`}
          />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button type="submit" disabled={reply.isPending}>
            <Send className="size-4" />
            {reply.isPending ? "در حال ارسال…" : "ارسال"}
          </Button>
        </form>
      )}
    </div>
  );
}
