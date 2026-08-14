"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STUDENT_LEVELS, STUDENT_LEVEL_STYLE } from "@/lib/student-level";
import { toFa } from "@/lib/format";

type StudentLevelSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  includeAll?: boolean;
};

export function StudentLevelSelect({
  value,
  onValueChange,
  id,
  includeAll = false,
}: StudentLevelSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} className="rounded-xl bg-white">
        <SelectValue placeholder="انتخاب سطح" />
      </SelectTrigger>
      <SelectContent>
        {includeAll ? (
          <SelectItem value="all">همه سطوح</SelectItem>
        ) : null}
        {STUDENT_LEVELS.map((n) => (
          <SelectItem key={n} value={String(n)}>
            <span className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: STUDENT_LEVEL_STYLE[n].color }}
              />
              سطح {toFa(n)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
