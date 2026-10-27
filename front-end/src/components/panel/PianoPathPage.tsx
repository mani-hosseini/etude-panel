"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Lock } from "lucide-react";

import { PageHeader } from "@/components/panel/PageHeader";
import { LevelJourney } from "@/components/panel/LevelJourney";
import { LevelStudioPanel } from "@/components/panel/LevelStudioPanel";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  queryErrorMessage,
  useDashboardQuery,
  usePathProgressQuery,
} from "@/lib/api/queries";
import { toFa } from "@/lib/format";
import {
  PIANO_PATH,
  PIANO_PATH_CREDIT,
  PIANO_PATH_INTRO,
  PATH_TRACKS,
  averageTrackProgress,
  curriculumFor,
  levelState,
  overallPathPercent,
  tracksForLevel,
} from "@/lib/piano-path";
import { parseStudentLevel, type StudentLevel } from "@/lib/student-level";
import { cn } from "@/lib/utils";

function PathRing({
  value,
  tone = "light",
}: {
  value: number;
  tone?: "light" | "onDark";
}) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, value)) / 100) * c;
  const onDark = tone === "onDark";

  return (
    <div className="relative size-[88px] shrink-0">
      <svg viewBox="0 0 88 88" className="size-full -rotate-90">
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          className={onDark ? "text-white/12" : "text-muted"}
        />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="text-brand"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            "font-sans text-lg font-semibold tabular-nums leading-none",
            onDark ? "text-white" : "text-navy",
          )}
        >
          {toFa(value)}٪
        </span>
      </div>
    </div>
  );
}

export function PianoPathPage() {
  const searchParams = useSearchParams();
  const query = useDashboardQuery();
  const pathQuery = usePathProgressQuery();

  const studentLevel = parseStudentLevel(
    pathQuery.data?.currentLevel ?? query.data?.student.level,
  );
  const selected = useMemo(() => {
    const fromUrl = Number.parseInt(searchParams.get("level") ?? "", 10);
    if (fromUrl >= 1 && fromUrl <= 10) return fromUrl as StudentLevel;
    return studentLevel;
  }, [searchParams, studentLevel]);

  if (query.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="surface-panel p-8 text-center text-sm text-destructive">
        {queryErrorMessage(query.error)}
      </div>
    );
  }

  const selectedCurriculum = curriculumFor(selected);
  const liveTracks = pathQuery.data?.tracks;
  const selectedTracks = tracksForLevel(selected, studentLevel, liveTracks);
  const selectedState = levelState(selected, studentLevel);
  const selectedAvg = averageTrackProgress(selectedTracks);
  const overall =
    pathQuery.data?.overallPercent ?? overallPathPercent(studentLevel, liveTracks);
  const remaining = Math.max(0, 10 - studentLevel);
  const completed = Math.max(0, studentLevel - 1);
  const signature = selectedCurriculum.pieces[0];
  const prevLevel = selected > 1 ? ((selected - 1) as StudentLevel) : null;
  const nextLevel = selected < 10 ? ((selected + 1) as StudentLevel) : null;

  const statusLabel =
    selectedState === "done"
      ? "تمام‌شده"
      : selectedState === "current"
        ? "سطح فعلی"
        : "هنوز باز نشده";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="کنسرواتوار اتود"
        title="مسیر سطح‌بندی"
        description={PIANO_PATH_INTRO}
      />

      <section className="relative overflow-hidden rounded-2xl bg-navy px-5 py-6 text-white sm:px-7 sm:py-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_100%_0%,rgba(0,71,255,0.32),transparent_55%)]"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4 sm:gap-5">
            <PathRing value={overall} tone="onDark" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-wide text-brand-300">
                پیشرفت کل مسیر
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight">
                سطح {toFa(studentLevel)} از ۱۰
              </h3>
              <p className="mt-1 text-sm text-white/55">
                {completed === 0
                  ? `${toFa(remaining)} سطح تا پایان مسیر`
                  : `${toFa(completed)} سطح کامل · ${toFa(remaining)} سطح باقی`}
              </p>
            </div>
          </div>
          <div className="min-w-0 flex-1 px-1 lg:ps-6">
            <LevelJourney
              level={studentLevel}
              selected={selected}
              tone="onDark"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.8fr)]">
        <article className="relative flex min-h-[36rem] flex-col overflow-hidden rounded-2xl border border-border bg-card">
          <span
            aria-hidden
            className="pointer-events-none absolute -left-3 top-2 font-display text-[8rem] font-bold leading-none text-navy/4"
          >
            {toFa(String(selected).padStart(2, "0"))}
          </span>

          <header className="relative flex items-start justify-between gap-4 p-5 sm:p-6">
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
                پرونده سطح
              </p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight text-navy">
                سطح {toFa(selected)}
              </h3>
              <p className="mt-1.5 truncate text-sm text-muted-foreground">
                {signature}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Badge
                variant={selectedState === "locked" ? "secondary" : "outline"}
                className={cn(
                  selectedState === "current" && "border-brand text-brand",
                  selectedState === "done" && "border-navy text-navy",
                )}
              >
                {statusLabel}
              </Badge>
              <p className="font-sans text-xs tabular-nums text-muted-foreground">
                میانگین {toFa(selectedAvg)}٪
              </p>
            </div>
          </header>

          {selectedState === "locked" ? (
            <p className="relative mx-5 mb-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs leading-6 text-muted-foreground sm:mx-6">
              این سطح هنوز در مسیر شما باز نشده؛ سیلابس را می‌توانید از همین‌جا
              ببینید.
            </p>
          ) : null}

          <ul className="relative grid grid-cols-2 gap-2 px-5 pb-4 sm:grid-cols-4 sm:px-6">
            {PATH_TRACKS.map((track) => (
              <li
                key={track.key}
                className="rounded-xl border border-border/80 bg-muted/25 px-3 py-2.5"
              >
                <p className="text-[11px] text-muted-foreground">{track.label}</p>
                <p className="mt-1 font-sans text-sm font-semibold tabular-nums text-navy">
                  {toFa(selectedTracks[track.key])}٪
                </p>
                <Progress
                  value={selectedTracks[track.key]}
                  className="mt-2 h-1.5"
                />
              </li>
            ))}
          </ul>

          <LevelStudioPanel
            state={selectedState}
            level={selected}
            studentLevel={studentLevel}
            curriculum={selectedCurriculum}
            path={pathQuery.data}
          />

          <footer className="relative mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border/80 px-5 py-3.5 sm:px-6">
            {prevLevel ? (
              <Link
                href={`?level=${prevLevel}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-navy"
              >
                <ArrowRight className="size-3.5" />
                سطح {toFa(prevLevel)}
              </Link>
            ) : (
              <span />
            )}
            {nextLevel ? (
              <Link
                href={`?level=${nextLevel}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-navy"
              >
                سطح {toFa(nextLevel)}
                <ArrowLeft className="size-3.5" />
              </Link>
            ) : (
              <span />
            )}
          </footer>
        </article>

        <aside className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border/80 px-4 py-3">
            <p className="text-sm font-semibold text-navy">سیلابس ده‌سطحی</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              هر سطح را برای دیدن پرونده انتخاب کنید
            </p>
          </div>
          <ol className="p-2">
            {PIANO_PATH.map((item) => {
              const state = levelState(item.level, studentLevel);
              const avg = averageTrackProgress(
                tracksForLevel(item.level, studentLevel),
              );
              const isActive = item.level === selected;

              return (
                <li key={item.level} className="relative">
                  <Link
                    href={`?level=${item.level}`}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 transition",
                      isActive ? "bg-navy text-white" : "hover:bg-muted/60",
                    )}
                  >
                    <span
                      className={cn(
                        "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                        isActive
                          ? "bg-white/15 text-white"
                          : state === "done"
                            ? "bg-navy text-white"
                            : state === "current"
                              ? "bg-brand text-white"
                              : "bg-muted text-muted-foreground",
                      )}
                    >
                      {state === "done" && !isActive ? (
                        <Check className="size-3.5" strokeWidth={2.4} />
                      ) : state === "locked" && !isActive ? (
                        <Lock className="size-3.5" />
                      ) : (
                        toFa(item.level)
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        سطح {toFa(item.level)}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block truncate text-[11px]",
                          isActive ? "text-white/65" : "text-muted-foreground",
                        )}
                      >
                        {item.pieces[0]}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "font-sans text-[11px] tabular-nums",
                        isActive ? "text-white/80" : "text-muted-foreground",
                      )}
                    >
                      {toFa(avg)}٪
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </aside>
      </section>

      <p className="text-center text-[11px] text-muted-foreground">
        گردآوری: {PIANO_PATH_CREDIT.curator} · تهیه و تنظیم:{" "}
        {PIANO_PATH_CREDIT.editor}
      </p>
    </div>
  );
}
