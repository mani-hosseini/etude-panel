import {
  CalendarClock,
  GraduationCap,
  MonitorSmartphone,
  Wallet,
} from "lucide-react";

import { formatDateTimeFa } from "@/lib/format";
import {
  SUPPORT_UNITS,
  TICKET_STATUS_COPY,
  type SupportTicket,
  type SupportUnitId,
  type TicketStatus,
} from "@/lib/support-tickets";
import { cn } from "@/lib/utils";

export const UNIT_ICON = {
  education: GraduationCap,
  finance: Wallet,
  reception: CalendarClock,
  tech: MonitorSmartphone,
} as const;

export const UNIT_TONE: Record<
  SupportUnitId,
  {
    bar: string;
    icon: string;
    chip: string;
    ring: string;
    soft: string;
    ink: string;
  }
> = {
  education: {
    bar: "bg-brand",
    icon: "bg-brand text-white",
    chip: "bg-brand-50 text-brand-700",
    ring: "ring-brand/25",
    soft: "bg-brand-50/80",
    ink: "text-brand-700",
  },
  finance: {
    bar: "bg-emerald-600",
    icon: "bg-emerald-600 text-white",
    chip: "bg-emerald-50 text-emerald-800",
    ring: "ring-emerald-500/25",
    soft: "bg-emerald-50/80",
    ink: "text-emerald-800",
  },
  reception: {
    bar: "bg-amber-500",
    icon: "bg-amber-500 text-white",
    chip: "bg-amber-50 text-amber-900",
    ring: "ring-amber-500/25",
    soft: "bg-amber-50/80",
    ink: "text-amber-900",
  },
  tech: {
    bar: "bg-violet-600",
    icon: "bg-violet-600 text-white",
    chip: "bg-violet-50 text-violet-800",
    ring: "ring-violet-500/25",
    soft: "bg-violet-50/80",
    ink: "text-violet-800",
  },
};

const STATUS_CLASS: Record<TicketStatus, string> = {
  pending: "bg-amber-50 text-amber-800",
  replied: "bg-emerald-50 text-emerald-800",
  closed: "bg-slate-100 text-slate-600",
};

export function TicketStatusBadge({
  status,
  audience = "student",
  className,
}: {
  status: TicketStatus;
  audience?: "student" | "admin";
  className?: string;
}) {
  const copy = TICKET_STATUS_COPY[status];
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium",
        STATUS_CLASS[status],
        className,
      )}
    >
      {audience === "admin" ? copy.admin : copy.label}
    </span>
  );
}

export function UnitIcon({
  unitId,
  className,
}: {
  unitId: SupportUnitId;
  className?: string;
}) {
  const Icon = UNIT_ICON[unitId];
  return <Icon className={className} strokeWidth={1.75} />;
}

export function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium transition",
        active
          ? "bg-navy text-white"
          : "bg-white text-slate-600 ring-1 ring-border hover:bg-brand-50",
      )}
    >
      {children}
    </button>
  );
}

export function TicketThread({
  ticket,
  studentLabel,
}: {
  ticket: SupportTicket;
  studentLabel: string;
}) {
  const unit = SUPPORT_UNITS.find((item) => item.id === ticket.unitId)!;
  const tone = UNIT_TONE[ticket.unitId];

  return (
    <ol className="space-y-3">
      {ticket.messages.map((message) => {
        const fromStudent = message.author === "student";
        return (
          <li
            key={message.id}
            className={cn("flex", fromStudent ? "justify-start" : "justify-end")}
          >
            <article
              className={cn(
                "max-w-[min(100%,34rem)] rounded-3xl px-4 py-3 shadow-soft",
                fromStudent
                  ? "rounded-br-md bg-white ring-1 ring-border"
                  : cn("rounded-bl-md text-white", tone.icon),
              )}
            >
              <p
                className={cn(
                  "text-[11px] font-medium",
                  fromStudent ? "text-muted-foreground" : "text-white/75",
                )}
              >
                {fromStudent ? studentLabel : unit.staffLabel}
                {" · "}
                {formatDateTimeFa(message.createdAt)}
              </p>
              <p className="mt-1.5 text-sm leading-7">{message.body}</p>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
