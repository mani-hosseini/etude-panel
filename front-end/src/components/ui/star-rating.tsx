"use client";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

const STAR_COUNT = 6;

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = "md",
  tone = "light",
}: {
  value: number;
  onChange?: (stars: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md";
  tone?: "light" | "onDark";
}) {
  const stars = Math.max(0, Math.min(STAR_COUNT, Math.round(value)));
  const dim =
    tone === "onDark" ? "text-white/25" : "text-slate-300";
  const gold = "text-amber-400";

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role={readOnly ? "img" : "group"}
      aria-label={`${stars} از ${STAR_COUNT} ستاره`}
    >
      {Array.from({ length: STAR_COUNT }, (_, index) => {
        const rank = index + 1;
        const active = rank <= stars;
        const className = cn(
          "shrink-0 transition-colors",
          size === "sm" ? "size-3.5" : "size-5",
          active ? gold : dim,
        );
        if (readOnly) {
          return (
            <Star
              key={rank}
              className={className}
              strokeWidth={1.5}
              fill={active ? "currentColor" : "none"}
            />
          );
        }
        return (
          <button
            key={rank}
            type="button"
            aria-label={`ستاره ${rank}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onChange?.(stars === rank ? 0 : rank);
            }}
            className="rounded-sm p-0.5 hover:scale-110"
          >
            <Star
              className={className}
              strokeWidth={1.5}
              fill={active ? "currentColor" : "none"}
            />
          </button>
        );
      })}
    </div>
  );
}
