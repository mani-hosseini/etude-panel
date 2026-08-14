"use client";

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

function LevelMedalIcon({
  className,
  color,
}: {
  className?: string;
  color: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block", className)}
      style={{
        backgroundColor: color,
        WebkitMaskImage: "url(/level-badge.png)",
        maskImage: "url(/level-badge.png)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

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
            ? "size-[4.5rem] justify-center gap-0.5 rounded-full bg-white p-1 ring-1 ring-current/50"
            : "gap-1",
          className,
        )}
        style={{ color: style.color }}
      >
        <LevelMedalIcon
          className={onDark ? "size-11" : "size-10"}
          color={style.color}
        />
        <span
          className={cn(
            "font-bold leading-none",
            onDark ? "text-[11px]" : "text-xs",
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
        "gap-1.5 rounded-full border bg-white px-3 py-1 text-xs font-bold leading-none shadow-none",
        className,
      )}
      style={{ borderColor: style.color, color: style.color }}
    >
      <LevelMedalIcon className="size-4" color={style.color} />
      سطح {toFa(n)}
    </Badge>
  );
}
