import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  backHref,
  backLabel = "بازگشت",
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div
      dir="rtl"
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 text-right">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-2 inline-flex items-center gap-1 text-xs text-slate-500 transition hover:text-brand"
          >
            <ChevronRight className="size-3.5" />
            {backLabel}
          </Link>
        ) : null}
        {eyebrow ? (
          <p className="text-xs font-medium text-brand">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
