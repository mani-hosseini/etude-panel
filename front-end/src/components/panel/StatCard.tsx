import { Card, CardContent } from "@/components/ui/card";
import { toFa } from "@/lib/format";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  hint: string;
  index?: number;
  className?: string;
};

export function StatCard({
  label,
  value,
  hint,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("h-full shadow-none", className)}>
      <CardContent className="p-3 sm:p-4">
        <p className="truncate font-sans text-[11px] text-muted-foreground sm:text-xs">
          {label}
        </p>
        <p className="mt-1.5 font-sans text-xl font-bold tabular-nums text-navy sm:mt-2 sm:text-2xl">
          {toFa(value)}
        </p>
        <p className="mt-1 truncate font-sans text-[11px] text-muted-foreground sm:text-xs">
          {toFa(hint)}
        </p>
      </CardContent>
    </Card>
  );
}
