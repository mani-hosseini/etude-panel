"use client";

import { parseStudentLevel, STUDENT_LEVEL_STYLE } from "@/lib/student-level";
import { toFa } from "@/lib/format";
import { cn } from "@/lib/utils";

type StudentLevelBadgeProps = {
  level: string | number | null | undefined;
  className?: string;
};

export function StudentLevelBadge({ level, className }: StudentLevelBadgeProps) {
  const n = parseStudentLevel(level);
  const style = STUDENT_LEVEL_STYLE[n];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
        className,
      )}
      style={{ backgroundColor: style.color, color: style.fg }}
    >
      سطح {toFa(n)}
    </span>
  );
}
