"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { audienceError } from "@/lib/api/errors";
import {
  studioApi,
  type StudioAssignment,
  type StudioStudentSession,
} from "@/lib/api/studio";
import { studioKeys } from "@/lib/api/studio-queries";
import { toFa } from "@/lib/format";
import { PATH_TRACKS, TRACK_CATEGORY_MAP } from "@/lib/piano-path";
import { announceSaved } from "@/lib/save-feedback";
import {
  assignmentsForSession,
  previousSessionForReview,
} from "@/lib/teacher-studio";
import { cn } from "@/lib/utils";

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function TeacherSessionScores({
  studentId,
  session,
  sessions = [],
  assignments,
  term = 1,
  disabled,
}: {
  studentId: string;
  session: StudioStudentSession | null;
  sessions?: StudioStudentSession[];
  assignments: StudioAssignment[];
  term?: number;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const reviewSession = useMemo(
    () => previousSessionForReview(sessions, session, term),
    [sessions, session, term],
  );
  const reviewTerm =
    session?.reviewTerm ??
    (session?.number === 1 && term > 1 ? term - 1 : term);
  const sessionAssignments = useMemo(
    () => assignmentsForSession(assignments, reviewSession, reviewTerm),
    [assignments, reviewSession, reviewTerm],
  );

  const rows = useMemo(
    () =>
      PATH_TRACKS.map((track) => ({
        track,
        items: sessionAssignments.filter(
          (item) =>
            (TRACK_CATEGORY_MAP[item.category] ?? "technique") === track.key,
        ),
      })),
    [sessionAssignments],
  );

  const savedScores = useMemo(() => {
    const next: Record<string, number> = {};
    for (const item of sessionAssignments) {
      const target = item.targets.find((row) => row.studentId === studentId);
      if (target) next[target.id] = clampScore(target.score ?? 0);
    }
    return next;
  }, [sessionAssignments, studentId]);

  const savedKey = Object.entries(savedScores)
    .map(([id, score]) => `${id}:${score}`)
    .join("|");

  const [drafts, setDrafts] = useState<Record<string, number>>({});

  useEffect(() => {
    setDrafts(savedScores);
  }, [reviewSession?.id, studentId, savedKey]);

  const dirty = Object.entries(drafts).some(
    ([id, score]) => score !== (savedScores[id] ?? 0),
  );
  const scorableCount = Object.keys(savedScores).length;

  const save = useMutation({
    mutationFn: () =>
      studioApi.saveScores(
        Object.entries(drafts).map(([targetId, score]) => ({
          targetId,
          score: clampScore(score),
        })),
      ),
    onSuccess: async (result) => {
      announceSaved(
        `${toFa(result.saved)} نمره از ۰ تا ۱۰۰ ثبت شد.`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: studioKeys.student(studentId) }),
        queryClient.invalidateQueries({ queryKey: studioKeys.assignments }),
        queryClient.invalidateQueries({ queryKey: studioKeys.overview }),
      ]);
    },
  });

  const setScore = (targetId: string, value: number) => {
    setDrafts((prev) => ({ ...prev, [targetId]: clampScore(value) }));
  };

  if (!session) {
    return (
      <p className="text-xs text-muted-foreground">جلسه‌ای انتخاب نشده است.</p>
    );
  }

  if (disabled) {
    return (
      <p className="text-xs leading-6 text-muted-foreground">
        کلاس تشکیل نشد؛ نمره اجرا برای این جلسه ثبت نمی‌شود.
      </p>
    );
  }

  const wrappedLast =
    session.number === 1 && reviewSession != null && reviewSession.number > 1;

  if (!reviewSession || (wrappedLast && scorableCount === 0)) {
    return (
      <p className="text-xs leading-6 text-muted-foreground">
        جلسه اول است. نمره تمرین‌ها از جلسه بعد ثبت می‌شود.
      </p>
    );
  }

  if (scorableCount === 0) {
    return (
      <p className="text-xs leading-6 text-muted-foreground">
        هنوز تکلیفی برای جلسه {toFa(reviewSession.number)} ثبت نشده تا نمره
        بگیرد.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {rows.map(({ track, items }) => (
          <li key={track.key} className="rounded-2xl border border-border/80 p-3">
            <p className="text-[11px] font-medium text-muted-foreground">
              {track.label}
            </p>
            {items.length === 0 ? (
              <p className="mt-1.5 text-sm text-muted-foreground">
                تمرینی برای این محور ثبت نشده
              </p>
            ) : (
              <ul className="mt-2 space-y-4">
                {items.map((item) => {
                  const target = item.targets.find(
                    (row) => row.studentId === studentId,
                  );
                  if (!target) return null;
                  const score = drafts[target.id] ?? savedScores[target.id] ?? 0;
                  return (
                    <li key={item.id} className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-6 text-navy">
                            {item.title}
                          </p>
                          {item.source ? (
                            <p className="text-[11px] text-muted-foreground">
                              {item.source}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={score}
                            className="h-9 w-16 text-center"
                            onChange={(event) =>
                              setScore(target.id, Number(event.target.value))
                            }
                          />
                          <span className="text-[11px] text-muted-foreground">
                            / {toFa(100)}
                          </span>
                        </div>
                      </div>
                      <label className="block">
                        <span className="sr-only">نمره با نوار پیشرفت</span>
                        <span className="relative block h-2.5">
                          <span className="absolute inset-0 overflow-hidden rounded-full bg-brand-100">
                            <span
                              className="block h-full rounded-full bg-linear-to-l from-brand to-brand-600"
                              style={{ width: `${score}%` }}
                            />
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={score}
                            onChange={(event) =>
                              setScore(target.id, Number(event.target.value))
                            }
                            className={cn(
                              "absolute inset-0 w-full cursor-pointer appearance-none bg-transparent",
                              "[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-navy [&::-webkit-slider-thumb]:shadow-sm",
                              "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-navy",
                            )}
                          />
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>

      {save.isError ? (
        <p className="text-xs text-rose-700">
          {audienceError(save.error, "ثبت نمرات انجام نشد.")}
        </p>
      ) : null}

      <Button
        type="button"
        className="w-full"
        disabled={save.isPending || scorableCount === 0 || !dirty}
        onClick={() => save.mutate()}
      >
        {save.isPending ? "در حال ثبت…" : "ثبت نهایی نمرات"}
      </Button>
    </div>
  );
}
