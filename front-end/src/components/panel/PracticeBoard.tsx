"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api/client";
import {
  queryKeys,
  useAssignmentsQuery,
  useDashboardQuery,
} from "@/lib/api/queries";
import type { StudentAssignment } from "@/lib/api/types";
import { executionScoreLabel, toFa } from "@/lib/format";
import { announceSaved } from "@/lib/save-feedback";

function useAssignmentProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, progress }: { id: string; progress: number }) =>
      api.updateAssignmentProgress(id, progress),
    onSuccess: async () => {
      announceSaved("پیشرفت تمرین ذخیره شد.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.assignments }),
        queryClient.invalidateQueries({ queryKey: queryKeys.path }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]);
    },
  });
}

export function AssignmentProgressCard({ item }: { item: StudentAssignment }) {
  const update = useAssignmentProgress();

  return (
    <article className="rounded-xl border border-border bg-background/60 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground">
            {item.category}
          </p>
          <h4 className="mt-1 text-sm font-semibold tracking-tight text-navy">
            {item.title}
          </h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.sessionNumber
              ? `جلسه ${toFa(item.sessionNumber)}`
              : item.source}
            {item.sessionNumber && item.source ? ` · ${item.source}` : ""}
          </p>
          {item.note ? (
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              {item.note}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 font-sans text-sm font-semibold tabular-nums text-navy">
          {toFa(item.progress)}٪
        </span>
      </div>
      <Progress value={item.progress} className="mt-3" />
      <input
        type="range"
        min={0}
        max={100}
        defaultValue={item.progress}
        className="mt-3 w-full accent-brand"
        onPointerUp={(event) =>
          update.mutate({
            id: item.id,
            progress: Number(event.currentTarget.value),
          })
        }
      />
    </article>
  );
}

export function SessionPracticeBoard({
  sessionNumber,
  sessionUuid,
}: {
  sessionNumber: number;
  sessionUuid?: string;
}) {
  const query = useAssignmentsQuery();
  const items = (query.data ?? []).filter(
    (item) =>
      (sessionUuid && item.sessionId === sessionUuid) ||
      item.sessionNumber === sessionNumber,
  );

  if (query.isPending) return null;
  if (items.length === 0) return null;

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-col gap-1 p-5 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-brand">
            تکلیف این جلسه
          </p>
          <CardTitle className="mt-1">تمرین جلسه {toFa(sessionNumber)}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            محور و تمرین این جلسه؛ نمره بعد از اجرا در کلاس ثبت می‌شود
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {toFa(items.length)} مورد
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 p-5 pt-0 sm:grid-cols-2">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-border/80 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-navy">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.source || item.note || "تمرین جلسه"}
                </p>
              </div>
              <Badge variant="outline">{item.category}</Badge>
            </div>
            <p className="mt-3 font-sans text-sm tabular-nums text-navy">
              امتیاز اجرا {toFa(item.score ?? 0)}
            </p>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, n) => sum + n, 0) / values.length);
}

export function RecentPracticeAverage() {
  const assignments = useAssignmentsQuery();
  const dashboard = useDashboardQuery();
  const items = assignments.data ?? [];
  const currentNumber = dashboard.data?.currentSession?.number ?? 1;
  const lastTwo = [currentNumber - 1, currentNumber].filter((n) => n >= 1);

  const rows = lastTwo.map((number) => {
    const group = items.filter((item) => item.sessionNumber === number);
    return {
      number,
      count: group.length,
      progress: average(group.map((item) => item.progress)),
    };
  });
  const overall = average(
    items
      .filter((item) => item.sessionNumber && lastTwo.includes(item.sessionNumber))
      .map((item) => item.progress),
  );

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-col gap-1 p-5 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-brand">
            جمع‌بندی تمرین
          </p>
          <CardTitle className="mt-1">میانگین دو جلسه اخیر</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            درصد تکالیف جلسه {toFa(lastTwo[0] ?? 1)}
            {lastTwo[1] ? ` و ${toFa(lastTwo[1])}` : ""}
          </p>
        </div>
        <p className="font-sans text-2xl font-semibold tabular-nums text-navy">
          {toFa(overall)}٪
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        <Progress value={overall} />
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <article
              key={row.number}
              className="rounded-xl border border-border bg-background/60 px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    جلسه {toFa(row.number)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-navy">
                    {row.count > 0
                      ? `${toFa(row.count)} تکلیف`
                      : "تکلیفی ثبت نشده"}
                  </p>
                </div>
                <span className="font-sans text-sm font-semibold tabular-nums text-navy">
                  {toFa(row.progress)}٪
                </span>
              </div>
              <Progress value={row.progress} className="mt-3" />
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
