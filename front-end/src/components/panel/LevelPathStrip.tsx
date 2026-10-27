"use client";

import Link from "next/link";
import { Check } from "lucide-react";

import { parseStudentLevel } from "@/lib/student-level";
import { PIANO_PATH, levelState } from "@/lib/piano-path";
import { toFa } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type LevelPathStripProps = {
  level: string | number | null | undefined;
  href?: string;
};

export function LevelPathStrip({
  level,
  href = routes.path,
}: LevelPathStripProps) {
  const current = parseStudentLevel(level);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {PIANO_PATH.map((item) => {
        const state = levelState(item.level, current);
        const inner = (
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition",
              state === "done" && "bg-navy text-white",
              state === "current" &&
                "bg-white text-navy ring-2 ring-navy ring-offset-2",
              state === "locked" && "bg-muted text-muted-foreground",
            )}
          >
            {state === "done" ? (
              <Check className="size-3.5" strokeWidth={2.4} />
            ) : (
              toFa(item.level)
            )}
          </span>
        );

        if (!href) return <span key={item.level}>{inner}</span>;

        return (
          <Link
            key={item.level}
            href={`${href}?level=${item.level}`}
            aria-label={`سطح ${toFa(item.level)}`}
            className="shrink-0"
          >
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
