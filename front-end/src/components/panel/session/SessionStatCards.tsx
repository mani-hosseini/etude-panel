"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type SessionStatCardItem = {
  id: string;
  label: string;
  value: string;
  icon: LucideIcon;
  active?: boolean;
  onSelect?: () => void;
};

export function SessionStatCards({ items }: { items: SessionStatCardItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        const interactive = Boolean(item.onSelect);
        const className = cn(
          "surface-panel flex w-full items-center gap-3 p-4 text-right transition",
          interactive &&
            "cursor-pointer hover:border-brand-200 hover:shadow-lift",
          item.active && "border-brand-300 ring-2 ring-brand/20",
        );

        if (interactive) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onSelect}
              aria-pressed={item.active}
              className={className}
            >
              <StatCardBody item={item} Icon={Icon} />
            </button>
          );
        }

        return (
          <div key={item.id} className={className}>
            <StatCardBody item={item} Icon={Icon} />
          </div>
        );
      })}
    </div>
  );
}

function StatCardBody({
  item,
  Icon,
}: {
  item: SessionStatCardItem;
  Icon: LucideIcon;
}) {
  return (
    <>
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand",
          item.active && "bg-brand text-white",
        )}
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{item.label}</p>
        <p className="font-sans text-sm font-semibold tabular-nums text-navy">
          {item.value}
        </p>
      </div>
    </>
  );
}
