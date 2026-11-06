"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, Plus, Rows3, Search } from "lucide-react";

import { LeadComposer } from "@/components/admin/registration/LeadComposer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api/admin-client";
import { adminQueryKeys, useAdminLeadsQuery } from "@/lib/api/admin-queries";
import { audienceError } from "@/lib/api/errors";
import { toFa } from "@/lib/format";
import { adminRoutes } from "@/lib/routes";
import { announceSaved } from "@/lib/save-feedback";
import {
  REGISTRATION_STATUSES,
  STATUS_META,
  followUpState,
  formatLeadDate,
  leadFullName,
  type RegistrationLead,
  type RegistrationStatus,
} from "@/lib/registration-pipeline";
import { cn } from "@/lib/utils";

type ViewMode = "board" | "list";
type BoardFilter = "all" | "today" | "overdue";

const COLUMN_TONE: Record<string, string> = {
  consulting: "bg-amber-50/80",
  deciding: "bg-sky-50/80",
  enrolled: "bg-emerald-50/70",
  lost: "bg-slate-100/80",
};

const DOT: Record<string, string> = {
  consulting: "bg-amber-500",
  deciding: "bg-sky-500",
  enrolled: "bg-emerald-500",
  lost: "bg-slate-400",
};

export function RegistrationPipelinePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const leadsQuery = useAdminLeadsQuery();
  const leads = leadsQuery.data?.leads ?? [];
  const [view, setView] = useState<ViewMode>("board");
  const [query, setQuery] = useState("");
  const [follow, setFollow] = useState<BoardFilter>("all");
  const [composer, setComposer] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.leads }),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.tasks }),
    ]);

  const createLead = useMutation({
    mutationFn: (input: { draft: Parameters<typeof adminApi.createLead>[0]; note: string }) =>
      adminApi.createLead({
        ...input.draft,
        note: input.note.trim() || undefined,
      }),
    onSuccess: async (lead) => {
      await invalidate();
      setComposer(false);
      announceSaved("تماس ذخیره شد.", { scroll: false });
      router.push(adminRoutes.registrationLead(lead.id));
    },
  });

  const moveLead = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RegistrationStatus }) =>
      adminApi.updateLead(id, { status }),
    onSuccess: async (lead, vars) => {
      await invalidate();
      if (vars.status === "enrolled") {
        announceSaved("تسک ثبت در سایت برای CRM ساخته شد.", { scroll: false });
      }
      return lead;
    },
  });

  const counts = useMemo(() => {
    let overdue = 0;
    let today = 0;
    for (const lead of leads) {
      if (lead.status === "enrolled" || lead.status === "lost") continue;
      const state = followUpState(lead.followUpDate);
      if (state === "overdue") overdue += 1;
      if (state === "today") today += 1;
    }
    return { overdue, today, total: leads.length };
  }, [leads]);

  const filtered = useMemo(() => {
    const q = query.trim();
    return leads.filter((lead) => {
      if (q) {
        const hay = `${lead.firstName} ${lead.lastName} ${lead.phone} ${lead.parentName}`;
        if (!hay.includes(q)) return false;
      }
      const state = followUpState(lead.followUpDate);
      if (follow === "today" && state !== "today") return false;
      if (follow === "overdue" && state !== "overdue") return false;
      return true;
    });
  }, [leads, query, follow]);

  if (leadsQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-14 rounded-2xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  if (leadsQuery.isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {audienceError(leadsQuery.error, "پرونده‌های ثبت‌نام الان در دسترس نیست.")}
      </div>
    );
  }

  const filters: { id: BoardFilter; label: string; count: number }[] = [
    { id: "all", label: "همه", count: counts.total },
    { id: "today", label: "زنگ امروز", count: counts.today },
    { id: "overdue", label: "عقب‌افتاده", count: counts.overdue },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">CRM</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            تماس بگیر، وضعیت را عوض کن، کارت را بکش.
          </p>
        </div>
        <Button onClick={() => setComposer(true)} className="rounded-xl">
          <Plus className="size-4" />
          تماس جدید
        </Button>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 sm:flex-row sm:items-center">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {filters.map((item) => {
            const active = follow === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFollow(item.id)}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition sm:flex-none",
                  active
                    ? item.id === "overdue"
                      ? "bg-white text-rose-700 shadow-sm"
                      : "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] tabular-nums",
                    active ? "bg-slate-100 text-slate-700" : "bg-white/70 text-slate-400",
                  )}
                >
                  {toFa(item.count)}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="نام یا شماره"
              className="h-10 border-0 bg-slate-50 ps-10 shadow-none"
            />
          </div>
          <div className="flex shrink-0 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              aria-label="نمای ستون‌ها"
              onClick={() => setView("board")}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-lg",
                view === "board" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400",
              )}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              aria-label="نمای فهرست"
              onClick={() => setView("list")}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-lg",
                view === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400",
              )}
            >
              <Rows3 className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {view === "board" ? (
        <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
          {REGISTRATION_STATUSES.map((status) => {
            const items = filtered.filter((lead) => lead.status === status);
            const meta = STATUS_META[status];
            return (
              <section
                key={status}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  const lead = leads.find((item) => item.id === id);
                  if (id && lead?.status !== status) {
                    moveLead.mutate({ id, status });
                  }
                  setDraggingId(null);
                }}
                className={cn(
                  "flex w-[min(16.5rem,80vw)] shrink-0 flex-col rounded-2xl p-2 lg:w-auto",
                  COLUMN_TONE[status],
                )}
              >
                <header className="mb-2 flex items-center justify-between gap-2 px-2 py-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", DOT[status])} />
                    <p className="text-[13px] font-bold text-slate-800">{meta.short}</p>
                  </div>
                  <span className="text-xs tabular-nums text-slate-500">
                    {toFa(items.length)}
                  </span>
                </header>
                <div className="flex min-h-36 flex-1 flex-col gap-2">
                  {items.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-xl px-3 py-8 text-center text-xs text-slate-400">
                      —
                    </div>
                  ) : (
                    items.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        dragging={draggingId === lead.id}
                        onDragStart={() => setDraggingId(lead.id)}
                        onDragEnd={() => setDraggingId(null)}
                        onOpen={() =>
                          router.push(adminRoutes.registrationLead(lead.id))
                        }
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {filtered.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-slate-400">
              پرونده‌ای پیدا نشد.
            </p>
          ) : (
            filtered.map((lead) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => router.push(adminRoutes.registrationLead(lead.id))}
                className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-right last:border-0 hover:bg-slate-50"
              >
                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    {leadFullName(lead)}
                  </span>
                  <span className="text-[11px] text-slate-400" dir="ltr">
                    {lead.phone}
                  </span>
                </span>
                <Badge className={STATUS_META[lead.status].chip}>
                  {STATUS_META[lead.status].short}
                </Badge>
              </button>
            ))
          )}
        </div>
      )}

      {composer ? (
        <LeadComposer
          busy={createLead.isPending}
          error={
            createLead.isError
              ? audienceError(createLead.error, "ثبت تماس انجام نشد.")
              : null
          }
          onClose={() => {
            createLead.reset();
            setComposer(false);
          }}
          onCreate={(draft, note) => {
            createLead.mutate({ draft, note });
          }}
        />
      ) : null}
    </div>
  );
}

function LeadCard({
  lead,
  dragging,
  onDragStart,
  onDragEnd,
  onOpen,
}: {
  lead: RegistrationLead;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpen: () => void;
}) {
  const follow = followUpState(lead.followUpDate);
  const showFollow =
    follow !== "none" && lead.status !== "enrolled" && lead.status !== "lost";

  return (
    <article
      draggable
      onDragStart={(e) => {
        if ((e.target as HTMLElement).closest("a")) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData("text/plain", lead.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-grab rounded-xl bg-white p-3 text-right shadow-sm ring-1 ring-slate-200/70 transition hover:ring-slate-300 active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <button type="button" onClick={onOpen} className="w-full text-right">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-bold text-slate-900">
            {leadFullName(lead)}
          </p>
          {lead.age ? (
            <span className="shrink-0 text-[10px] text-slate-400">
              {toFa(lead.age)} سال
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs tracking-wide text-slate-500" dir="ltr">
          {lead.phone}
        </p>
        {showFollow ? (
          <p
            className={cn(
              "mt-2 text-[11px] font-medium",
              follow === "overdue" && "text-rose-600",
              follow === "today" && "text-brand",
              follow === "upcoming" && "text-slate-400",
            )}
          >
            {follow === "overdue"
              ? `عقب‌افتاده · ${formatLeadDate(lead.followUpDate)}`
              : follow === "today"
                ? "زنگ امروز"
                : formatLeadDate(lead.followUpDate)}
          </p>
        ) : null}
      </button>
      {lead.status === "enrolled" ? (
        <Link
          href={adminRoutes.taskForLead(lead.id)}
          draggable={false}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onDragStart={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className="mt-2 inline-flex text-[11px] font-semibold text-brand hover:underline"
        >
          تسک CRM
        </Link>
      ) : null}
    </article>
  );
}
