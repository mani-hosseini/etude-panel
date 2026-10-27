"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toFa } from "@/lib/format";
import { routes, type SessionPlayViewKind } from "@/lib/routes";
import { cn } from "@/lib/utils";

type SessionPagerItem = {
  id: string;
  number: number;
};

type SessionPagerProps = {
  courseId?: string;
  sessions: SessionPagerItem[];
  currentNumber: number;
  view?: SessionPlayViewKind;
  className?: string;
};

export function SessionPager({
  courseId,
  sessions,
  currentNumber,
  view,
  className,
}: SessionPagerProps) {
  if (!courseId || sessions.length === 0) return null;

  const ordered = [...sessions].sort((a, b) => a.number - b.number);
  const index = ordered.findIndex((item) => item.number === currentNumber);
  const prev = index > 0 ? ordered[index - 1] : null;
  const next =
    index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {prev ? (
        <Button asChild variant="outline" size="sm" className="rounded-xl">
          <Link href={routes.courseSession(courseId, prev.id, view)}>
            <ChevronRight className="size-3.5" />
            جلسه قبل
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="rounded-xl" disabled>
          <ChevronRight className="size-3.5" />
          جلسه قبل
        </Button>
      )}
      <span className="hidden min-w-14 text-center text-[11px] font-medium text-muted-foreground sm:inline">
        {toFa(currentNumber)} از {toFa(ordered.length)}
      </span>
      {next ? (
        <Button asChild variant="outline" size="sm" className="rounded-xl">
          <Link href={routes.courseSession(courseId, next.id, view)}>
            جلسه بعد
            <ChevronLeft className="size-3.5" />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="rounded-xl" disabled>
          جلسه بعد
          <ChevronLeft className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
