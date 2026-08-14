"use client";

import { Award } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { parseStudentLevel, STUDENT_LEVEL_STYLE } from "@/lib/student-level";
import { toFa } from "@/lib/format";
import { cn } from "@/lib/utils";

type StudentLevelBadgeProps = {
  level: string | number | null | undefined;
  className?: string;
  layout?: "inline" | "stack";
  /** White chip so the level color stays readable on dark banners. */
  onDark?: boolean;
};

export function StudentLevelBadge({
  level,
  className,
  layout = "inline",
  onDark = false,
}: StudentLevelBadgeProps) {
  const n = parseStudentLevel(level);
  const style = STUDENT_LEVEL_STYLE[n];

  if (layout === "stack") {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 flex-col items-center",
          onDark
            ? "gap-0.5 rounded-lg bg-white px-1.5 py-1 ring-1 ring-current"
            : "gap-0.5",
          className,
        )}
        style={{ color: style.color }}
      >
        <Award
          className={onDark ? "size-5" : "size-8"}
          fill="currentColor"
          strokeWidth={1.75}
        />
        <span
          className={cn(
            "font-bold leading-none",
            onDark ? "text-[9px]" : "text-[10px]",
          )}
        >
          سطح {toFa(n)}
        </span>
      </span>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 rounded-full border bg-white px-2 py-0.5 text-[10px] font-bold leading-none shadow-none",
        className,
      )}
      style={{ borderColor: style.color, color: style.color }}
    >
      <Award className="size-3" fill="currentColor" strokeWidth={1.75} />
      سطح {toFa(n)}
    </Badge>
  );
}
