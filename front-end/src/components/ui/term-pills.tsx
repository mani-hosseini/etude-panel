"use client";

import { toFa } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TermPills({
  currentTerm,
  selectedTerm,
  onChange,
  className,
  tone = "light",
}: {
  currentTerm: number;
  selectedTerm: number;
  onChange: (term: number) => void;
  className?: string;
  tone?: "light" | "onDark";
}) {
  const count = Math.max(currentTerm, 1);
  if (count <= 1) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {Array.from({ length: count }, (_, index) => index + 1).map((term) => {
        const selected = term === selectedTerm;
        return (
          <button
            key={term}
            type="button"
            onClick={() => onChange(term)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium ring-1 transition",
              tone === "onDark"
                ? selected
                  ? "bg-white text-navy ring-white"
                  : "bg-white/10 text-white/80 ring-white/20 hover:bg-white/20"
                : selected
                  ? "bg-navy text-white ring-navy"
                  : "bg-white text-muted-foreground ring-border hover:text-navy",
            )}
          >
            ترم {toFa(term)}
            {term === currentTerm ? " · جاری" : ""}
          </button>
        );
      })}
    </div>
  );
}
