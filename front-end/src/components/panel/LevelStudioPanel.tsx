"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Flame } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { StarRating } from "@/components/ui/star-rating";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PathProgress } from "@/lib/api/types";
import { toFa } from "@/lib/format";
import {
  PATH_TRACKS,
  averageTrackProgress,
  pathChartRows,
  tracksForLevel,
  type LevelProgressState,
  type PianoLevelCurriculum,
} from "@/lib/piano-path";
import type { StudentLevel } from "@/lib/student-level";

const levelChartConfig = {
  progress: { label: "پیشرفت", color: "#0047ff" },
  current: { label: "سطح فعلی", color: "#0047ff" },
  done: { label: "تمام‌شده", color: "#7aa2ff" },
  locked: { label: "باقی", color: "rgba(255,255,255,0.2)" },
} satisfies ChartConfig;

const radarChartConfig = {
  progress: { label: "مهارت", color: "#5b9bff" },
} satisfies ChartConfig;

export function LevelStudioPanel({
  state,
  level,
  studentLevel,
  curriculum,
  path,
}: {
  state: LevelProgressState;
  level: number;
  studentLevel: StudentLevel;
  curriculum: PianoLevelCurriculum;
  path?: PathProgress;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("path");
  const streak = path?.streak ?? 0;
  const focus =
    path?.focus ??
    (path?.assignments ?? []).find((item) => item.progress < 100) ??
    null;

  const selectedTracks = tracksForLevel(
    level as StudentLevel,
    studentLevel,
    path?.tracks,
  );
  const selectedAvg = averageTrackProgress(selectedTracks);

  const levelRows = useMemo(() => {
    if (path?.levels?.length) {
      return path.levels.map((item) => ({
        level: item.level,
        label: String(item.level),
        progress: item.progress,
        state: item.state,
      }));
    }
    return pathChartRows(studentLevel, path?.tracks);
  }, [path?.levels, path?.tracks, studentLevel]);

  const radarRows = PATH_TRACKS.map((track) => ({
    label:
      track.key === "theory"
        ? "تئوری"
        : track.key === "technique"
          ? "تکنیک"
          : track.key === "solfege"
            ? "سلفژ"
            : "قطعه",
    progress: selectedTracks[track.key],
  }));

  return (
    <div className="relative mx-5 mb-2 flex flex-1 flex-col overflow-hidden rounded-2xl bg-navy p-4 text-white sm:mx-6 sm:p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,rgba(0,71,255,0.38),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 bottom-0 size-40 rounded-full bg-[radial-gradient(circle,rgba(91,155,255,0.18),transparent_70%)]"
      />
      <div className="relative flex flex-1 flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-brand-300">
              {state === "locked"
                ? "مقصد بعدی مسیر"
                : state === "done"
                  ? "این سطح را تمام کرده‌اید"
                  : "اتاق تمرین"}
            </p>
            <h4 className="mt-1 text-base font-semibold tracking-tight">
              {state === "current"
                ? "پیشرفت همین سطح را ببین"
                : state === "done"
                  ? curriculum.pieces[0]
                  : `سطح ${toFa(level)} در انتظار توست`}
            </h4>
            <p className="mt-1 text-xs leading-6 text-white/60">
              {state === "locked"
                ? "نمودار مسیر نشان می‌دهد تا این سطح چقدر فاصله داری."
                : state === "done"
                  ? "کارنامه این سطح کامل است."
                  : focus
                    ? `تمرکز امروز: ${focus.title}`
                    : "هر ستون یک سطح است. روی سطح بزن تا پرونده‌اش باز شود."}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="rounded-xl bg-white/8 px-2.5 py-2 text-center ring-1 ring-white/10">
              <Flame className="mx-auto size-4 text-brand-300" />
              <p className="mt-1 font-sans text-sm font-bold tabular-nums">
                {toFa(streak)}
              </p>
              <p className="text-[10px] text-white/55">روز پیوسته</p>
            </div>
            {typeof path?.stars === "number" ? (
              <StarRating value={path.stars} readOnly size="sm" tone="onDark" />
            ) : null}
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col">
          <TabsList className="h-9 border-white/10 bg-white/8 p-0.5 text-white/55 shadow-none">
            <TabsTrigger
              value="path"
              className="rounded-xl text-[11px] data-[state=active]:bg-brand data-[state=active]:text-white"
            >
              پیشرفت سطوح
            </TabsTrigger>
            <TabsTrigger
              value="skills"
              className="rounded-xl text-[11px] data-[state=active]:bg-brand data-[state=active]:text-white"
            >
              مهارت این سطح
            </TabsTrigger>
          </TabsList>

          <TabsContent value="path" className="mt-3 flex flex-1 flex-col">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/55">
              <p>
                سطح {toFa(studentLevel)} از ۱۰ · میانگین مسیر{" "}
                <span className="font-sans tabular-nums text-white">
                  {toFa(path?.overallPercent ?? 0)}٪
                </span>
              </p>
              <div className="flex items-center gap-3">
                <LegendDot color="var(--color-done)" label="تمام" />
                <LegendDot color="var(--color-current)" label="فعلی" />
              </div>
            </div>
            <ChartContainer
              config={levelChartConfig}
              className="aspect-auto h-52 w-full [&_.recharts-cartesian-axis-tick_text]:fill-white/50 [&_.recharts-cartesian-grid_line]:stroke-white/10"
            >
              <BarChart
                accessibilityLayer
                data={levelRows}
                margin={{ left: 8, right: 8, top: 12, bottom: 0 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="level"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tickFormatter={(value) => toFa(value)}
                />
                <YAxis hide domain={[0, 100]} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      indicator="dot"
                      formatter={(value, _name, item) => {
                        const row = item?.payload as
                          | { level?: number; state?: string }
                          | undefined;
                        const status =
                          row?.state === "done"
                            ? "تمام‌شده"
                            : row?.state === "current"
                              ? "سطح فعلی"
                              : "هنوز باز نشده";
                        return (
                          <div className="flex w-full items-center justify-between gap-4">
                            <span className="text-muted-foreground">
                              سطح {toFa(row?.level ?? "")} · {status}
                            </span>
                            <span className="font-mono font-medium tabular-nums">
                              {toFa(Number(value))}٪
                            </span>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Bar dataKey="progress" radius={8} maxBarSize={36} cursor="pointer">
                  {levelRows.map((row) => (
                    <Cell
                      key={row.level}
                      cursor="pointer"
                      fill={
                        row.state === "current"
                          ? "var(--color-current)"
                          : row.state === "done"
                            ? "var(--color-done)"
                            : "var(--color-locked)"
                      }
                      fillOpacity={row.level === level ? 1 : 0.85}
                      onClick={() => router.push(`?level=${row.level}`)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </TabsContent>

          <TabsContent value="skills" className="mt-3 grid flex-1 gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <ChartContainer
              config={radarChartConfig}
              className="aspect-auto h-56 w-full [&_.recharts-polar-grid_line]:stroke-white/15 [&_.recharts-polar-angle-axis-tick_text]:fill-white/70"
            >
              <RadarChart data={radarRows} cx="50%" cy="50%" outerRadius="72%">
                <PolarGrid stroke="rgba(255,255,255,0.16)" />
                <PolarAngleAxis
                  dataKey="label"
                  tick={{ fill: "rgba(255,255,255,0.72)", fontSize: 11 }}
                />
                <PolarRadiusAxis
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  dataKey="progress"
                  stroke="var(--color-progress)"
                  fill="var(--color-progress)"
                  fillOpacity={0.35}
                  strokeWidth={2}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, _name, item) => (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            {(item?.payload as { label?: string } | undefined)
                              ?.label ?? "مهارت"}
                          </span>
                          <span className="font-mono font-medium tabular-nums">
                            {toFa(Number(value))}٪
                          </span>
                        </div>
                      )}
                    />
                  }
                />
              </RadarChart>
            </ChartContainer>
            <div className="space-y-2.5">
              <p className="text-[11px] text-white/55">
                میانگین این سطح{" "}
                <span className="font-sans tabular-nums text-white">
                  {toFa(selectedAvg)}٪
                </span>
              </p>
              {PATH_TRACKS.map((track) => (
                <div key={track.key} className="rounded-xl bg-white/6 px-3 py-2 ring-1 ring-white/10">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">{track.label}</p>
                    <span className="font-sans text-[11px] tabular-nums text-white/80">
                      {toFa(selectedTracks[track.key])}٪
                    </span>
                  </div>
                  <Progress
                    value={selectedTracks[track.key]}
                    className="h-1.5 bg-white/10"
                  />
                  <p className="mt-1.5 line-clamp-1 text-[10px] text-white/45">
                    {track.key === "piece"
                      ? curriculum.pieces.join(" · ")
                      : curriculum[track.key]}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

