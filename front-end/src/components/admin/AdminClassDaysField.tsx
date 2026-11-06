"use client";

import { WeekdayPicker } from "@/components/ui/weekday-picker";
import { parseDays } from "@/lib/format";

export function courseAllowedDays(course: {
  days?: string[] | null;
  day?: string | null;
}) {
  return parseDays(course.days, course.day);
}

export function resolvedEnrollDays(allowed: string[], selected: string[]) {
  if (allowed.length <= 1) return allowed;
  return selected;
}

export function AdminClassDaysField({
  allowedDays,
  value,
  onChange,
  disabled,
  label = "این هنرجو کدام روز این کلاس است؟",
}: {
  allowedDays: string[];
  value: string[];
  onChange: (days: string[]) => void;
  disabled?: boolean;
  label?: string;
}) {
  if (allowedDays.length <= 1) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-slate-500">{label}</p>
      <WeekdayPicker
        size="sm"
        options={allowedDays}
        min={1}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
