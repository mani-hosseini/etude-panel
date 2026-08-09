"use client";

import { motion, useReducedMotion } from "motion/react";

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
  index = 0,
  className,
}: StatCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      <Card className={cn("shadow-soft", className)}>
        <CardContent className="p-4">
          <p className="font-sans text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 font-sans text-2xl font-bold tabular-nums text-navy">
            {toFa(value)}
          </p>
          <p className="mt-1 font-sans text-xs text-muted-foreground">
            {toFa(hint)}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
