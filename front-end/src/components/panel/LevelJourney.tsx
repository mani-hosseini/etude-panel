"use client";

import Link from "next/link";
import { Check } from "lucide-react";

import { parseStudentLevel } from "@/lib/student-level";
import { PIANO_PATH, levelState } from "@/lib/piano-path";
import { toFa } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type LevelJourneyProps = {
  level: string | number | null | undefined;
  selected?: number;
  href?: string;
  tone?: "light" | "onDark";
};

export function LevelJourney({
  level,
  selected,
  href = routes.path,
  tone = "light",
}: LevelJourneyProps) {
  const current = parseStudentLevel(level);
  const active = selected ?? current;
  const onDark = tone === "onDark";

  return (
    <div className="-mx-1 overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max items-center sm:w-full sm:min-w-0">
        {PIANO_PATH.map((item, index) => {
          const state = levelState(item.level, current);
          const isSelected = item.level === active;

          return (
            <div
              key={item.level}
              className="flex min-w-0 flex-none items-center last:flex-none sm:flex-1"
            >
              <Link
                href={`${href}?level=${item.level}`}
                aria-label={`سطح ${toFa(item.level)}`}
                aria-current={isSelected ? "step" : undefined}
                className={cn(
                  "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition sm:size-9 sm:text-[11px]",
                  onDark
                    ? cn(
                        state === "done" && "bg-white text-navy",
                        state === "current" &&
                          "bg-brand text-white shadow-[0_0_0_4px_rgba(0,71,255,0.35)]",
                        state === "locked" && "bg-white/12 text-white/70",
                        isSelected &&
                          state !== "current" &&
                          "ring-2 ring-white/80 ring-offset-2 ring-offset-navy",
                      )
                    : cn(
                        state === "done" && "bg-navy text-white",
                        state === "current" &&
                          "bg-brand text-white shadow-[0_0_0_4px_rgba(0,71,255,0.16)]",
                        state === "locked" && "bg-muted text-muted-foreground",
                        isSelected &&
                          state !== "current" &&
                          "ring-2 ring-navy ring-offset-2 ring-offset-background",
                      ),
                )}
              >
                {state === "done" && !isSelected ? (
                  <Check className="size-3.5" strokeWidth={2.4} />
                ) : (
                  toFa(item.level)
                )}
              </Link>
              {index < PIANO_PATH.length - 1 ? (
                <span
                  className={cn(
                    "mx-0.5 h-px min-w-1.5 flex-1 rounded-full sm:mx-1.5 sm:min-w-2",
                    item.level < current
                      ? onDark
                        ? "bg-white/70"
                        : "bg-navy"
                      : onDark
                        ? "bg-white/25"
                        : "bg-border",
                  )}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
