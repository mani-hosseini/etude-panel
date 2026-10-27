"use client";

import { WEEKDAYS } from "@/lib/format";
import { cn } from "@/lib/utils";

type WeekdayPickerProps = {
  value: string[];
  onChange: (days: string[]) => void;
  options?: readonly string[];
  min?: number;
  disabled?: boolean;
  size?: "sm" | "md";
};

export function WeekdayPicker({
  value,
  onChange,
  options = WEEKDAYS,
  min = 1,
  disabled = false,
  size = "md",
}: WeekdayPickerProps) {
  const selected = new Set(value);

  const toggle = (day: string) => {
    if (disabled) return;
    const next = selected.has(day)
      ? value.filter((item) => item !== day)
      : [...value, day];
    if (next.length < min) return;
    onChange(WEEKDAYS.filter((item) => next.includes(item)));
  };

  return (
    <div
      className={cn(
        "grid gap-1.5",
        options.length >= 7 ? "grid-cols-4 sm:grid-cols-7" : "grid-cols-3 sm:grid-cols-4",
      )}
    >
      {options.map((day) => {
        const active = selected.has(day);
        return (
          <button
            key={day}
            type="button"
            disabled={disabled}
            onClick={() => toggle(day)}
            className={cn(
              "rounded-xl border font-semibold transition",
              size === "sm" ? "px-1.5 py-1.5 text-[11px]" : "px-2 py-2.5 text-sm",
              active
                ? "border-brand bg-brand text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-brand/40 hover:bg-brand/5",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            {day}
          </button>
        );
      })}
    </div>
  );
}
