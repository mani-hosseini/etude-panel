"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api/admin-client";
import { audienceError } from "@/lib/api/errors";
import { EXAM_SCORE_MAX, toLatinDigits } from "@/lib/format";

function scoreToInput(score: number | null): string {
  if (score == null || !Number.isFinite(score)) return "";
  return Number.isInteger(score) ? String(score) : String(score);
}

function parseScore(
  raw: string,
): { ok: true; value: number | null } | { ok: false } {
  const trimmed = toLatinDigits(raw).trim().replace("٫", ".");
  if (!trimmed) return { ok: true, value: null };
  if (!/^\d{1,3}(?:\.\d)?$/.test(trimmed)) return { ok: false };
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0 || value > EXAM_SCORE_MAX) {
    return { ok: false };
  }
  return { ok: true, value };
}

export function ExamGradeField({
  examId,
  userId,
  score,
  invalidateKeys,
}: {
  examId: string;
  userId: string;
  score: number | null;
  invalidateKeys?: readonly unknown[][];
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => scoreToInput(score));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(scoreToInput(score));
  }, [score]);

  const save = useMutation({
    mutationFn: (next: number | null) =>
      adminApi.updateExamGrade(examId, { userId, score: next }),
    onSuccess: async () => {
      setError(null);
      setSaved(true);
      const keys = invalidateKeys ?? [["admin", "exam", examId]];
      await Promise.all(
        keys.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey: [...queryKey] }),
        ),
      );
    },
    onError: (err) => {
      setSaved(false);
      setError(audienceError(err, "ثبت نمره انجام نشد."));
    },
  });

  const commit = () => {
    const parsed = parseScore(draft);
    if (!parsed.ok) {
      setSaved(false);
      setError("نمره باید بین ۰ تا ۱۰۰ باشد.");
      return;
    }
    if (parsed.value === (score ?? null)) {
      setError(null);
      return;
    }
    save.mutate(parsed.value);
  };

  return (
    <div className="min-w-30">
      <div className="flex items-center gap-1.5">
        <Input
          inputMode="decimal"
          dir="ltr"
          aria-label="نمره از صد"
          placeholder="—"
          value={draft}
          disabled={save.isPending}
          onChange={(event) => {
            setDraft(event.target.value);
            setSaved(false);
            setError(null);
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              (event.target as HTMLInputElement).blur();
            }
          }}
          className="h-10 w-22 px-2 text-center tabular-nums"
        />
        <span className="shrink-0 text-xs text-slate-500">از ۱۰۰</span>
        {save.isPending ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-slate-400" />
        ) : saved ? (
          <Check className="size-4 shrink-0 text-emerald-600" />
        ) : null}
      </div>
      {error ? <p className="mt-1 text-[11px] text-rose-600">{error}</p> : null}
    </div>
  );
}
