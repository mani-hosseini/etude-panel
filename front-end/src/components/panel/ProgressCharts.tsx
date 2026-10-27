"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { usePathProgressQuery } from "@/lib/api/queries";
import type { PathTrackStat } from "@/lib/api/types";
import { toFa } from "@/lib/format";
import { PATH_TRACKS } from "@/lib/piano-path";

const BRAND = "#0047ff";
const MUTED = "#dbe4ff";

const TRACK_COLORS: Record<string, string> = {
  technique: "#7db2ff",
  theory: "#2ee6a6",
  solfege: "#ffc14d",
  piece: "#ff7ab6",
};

const barConfig = {
  score: { label: "میانگین امتیاز", color: BRAND },
} satisfies ChartConfig;

const sessionBarConfig = {
  technique: { label: "تکنیک", color: TRACK_COLORS.technique },
  theory: { label: "تئوری موسیقی", color: TRACK_COLORS.theory },
  solfege: { label: "سلفژ", color: TRACK_COLORS.solfege },
  piece: { label: "قطعه", color: TRACK_COLORS.piece },
} satisfies ChartConfig;

function fallbackStats(
  tracks?: {
    technique: number;
    theory: number;
    solfege: number;
    piece: number;
  },
): PathTrackStat[] {
  return PATH_TRACKS.map((track) => ({
    key: track.key,
    label: track.label,
    average: tracks?.[track.key] ?? 0,
    count: (tracks?.[track.key] ?? 0) > 0 ? 1 : 0,
    sessions: [],
  }));
}

function useTrackStats() {
  const query = usePathProgressQuery();
  const stats =
    query.data?.trackStats?.length
      ? query.data.trackStats
      : fallbackStats(query.data?.tracks);
  return { query, stats };
}

function ScoreTooltip({
  value,
  label,
  count,
}: {
  value: number;
  label?: string;
  count?: number;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <span className="text-muted-foreground">
        {label}
        {count ? ` · ${toFa(count)} جلسه` : ""}
      </span>
      <span className="font-mono font-medium tabular-nums">{toFa(value)}</span>
    </div>
  );
}

export function PracticeAreaChart() {
  const { query, stats } = useTrackStats();
  const sessionNumbers = [
    ...new Set(
      stats.flatMap((item) =>
        item.sessions.map((row) =>
          row.sessionNumber != null && row.sessionNumber > 0
            ? row.sessionNumber
            : 0,
        ),
      ),
    ),
  ]
    .filter((value) => value >= 0)
    .sort((a, b) => a - b);

  const data = sessionNumbers.map((number) => {
    const point: Record<string, number | string> = {
      label: number > 0 ? `جلسه ${toFa(number)}` : "سایر",
    };
    for (const track of stats) {
      const hit = track.sessions.find((row) =>
        number > 0
          ? row.sessionNumber === number
          : row.sessionNumber == null || row.sessionNumber <= 0,
      );
      if (hit) point[track.key] = hit.score;
    }
    return point;
  });

  if (query.isPending) {
    return <Skeleton className="h-[360px] rounded-2xl" />;
  }

  return (
    <div className="flex min-h-[360px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-navy text-white shadow-lift">
      <div className="px-5 pt-5">
        <h3 className="text-sm font-semibold tracking-tight">میانگین چهار محور</h3>
        <p className="mt-1 text-xs text-white/50">
          نمرهٔ هر محور در هر جلسه؛ محور بدون نمره در آن جلسه خالی می‌ماند
        </p>
      </div>
      <div className="grid grid-cols-4 gap-2 px-5 pt-4">
        {stats.map((track) => (
          <div
            key={track.key}
            className="rounded-xl bg-white/6 px-2 py-2 text-center ring-1 ring-white/8"
          >
            <p className="flex items-center justify-center gap-1 text-[10px] text-white/55">
              <span
                className="size-1.5 rounded-full"
                style={{ background: TRACK_COLORS[track.key] }}
              />
              {track.label}
            </p>
            <p className="mt-1 font-sans text-base font-semibold tabular-nums">
              {toFa(track.average)}
            </p>
            <p className="mt-0.5 text-[10px] text-white/40">
              {track.count > 0
                ? `${toFa(track.count)} جلسه`
                : "بدون نمره"}
            </p>
          </div>
        ))}
      </div>
      <div className="h-[220px] w-full px-2 pb-3 pt-2">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-xs text-white/45">
            هنوز امتیازی از استاد ثبت نشده. با اولین نمره، نمودار جلسات پر می‌شود.
          </div>
        ) : (
          <ChartContainer
            config={sessionBarConfig}
            className="aspect-auto h-full w-full [&_.recharts-cartesian-axis-tick_text]:fill-white/45 [&_.recharts-cartesian-grid_line]:stroke-white/10"
          >
            <BarChart
              data={data}
              margin={{ left: 8, right: 12, top: 16, bottom: 0 }}
              barCategoryGap="28%"
              barGap={3}
            >
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <YAxis
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                width={28}
                tickFormatter={(value) => toFa(Number(value))}
              />
              <ChartTooltip
                cursor={{ fill: "rgba(255,255,255,0.06)" }}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <ScoreTooltip
                        value={Number(value)}
                        label={
                          sessionBarConfig[name as keyof typeof sessionBarConfig]
                            ?.label ?? String(name)
                        }
                      />
                    )}
                  />
                }
              />
              {PATH_TRACKS.map((track) => (
                <Bar
                  key={track.key}
                  dataKey={track.key}
                  fill={TRACK_COLORS[track.key]}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={22}
                />
              ))}
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}

export function AssignmentBarChart() {
  const { query, stats } = useTrackStats();
  const data = stats.map((track) => ({
    key: track.key,
    label: track.label,
    score: track.average,
    count: track.count,
  }));

  if (query.isPending) {
    return <Skeleton className="h-[360px] rounded-2xl" />;
  }

  return (
    <div className="flex min-h-[360px] flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="px-5 pt-5">
        <h3 className="text-sm font-semibold tracking-tight text-navy">
          امتیاز اجرا بر محور
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          میانگین نمرهٔ هر محور در تمام جلسات؛ محور بدون نمره صفر می‌ماند
        </p>
      </div>
      <div className="h-[280px] w-full px-2 pb-3">
        <ChartContainer config={barConfig} className="aspect-auto h-full w-full">
          <BarChart data={data} margin={{ left: 8, right: 8, top: 24, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              width={28}
              tickFormatter={(value) => toFa(Number(value))}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, _name, item) => {
                    const row = item?.payload as
                      | { label?: string; count?: number }
                      | undefined;
                    return (
                      <ScoreTooltip
                        value={Number(value)}
                        label={row?.label}
                        count={row?.count}
                      />
                    );
                  }}
                />
              }
            />
            <Bar dataKey="score" radius={[8, 8, 0, 0]} maxBarSize={48}>
              {data.map((item) => (
                <Cell
                  key={item.key}
                  fill={item.count > 0 ? BRAND : MUTED}
                />
              ))}
              <LabelList
                dataKey="score"
                position="top"
                formatter={(value: number | string) => toFa(Number(value))}
                className="fill-navy text-[11px]"
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
