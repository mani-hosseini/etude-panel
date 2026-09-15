import { EXAM_SCORE_MAX, formatExamScoreValue } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ExamScoreRing({
  score,
  size = 112,
  className,
}: {
  score: number | null;
  size?: number;
  className?: string;
}) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const ratio =
    score == null ? 0 : Math.min(1, Math.max(0, score / EXAM_SCORE_MAX));
  const offset = circumference * (1 - ratio);
  const graded = score != null;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 96 96" className="size-full -rotate-90">
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-slate-200"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={graded ? "text-brand" : "text-transparent"}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {graded ? (
          <>
            <span className="font-display text-xl font-bold tabular-nums text-navy">
              {formatExamScoreValue(score)}
            </span>
            <span className="text-[10px] font-medium text-slate-500">
              از ۱۰۰
            </span>
          </>
        ) : (
          <span className="text-xs font-medium text-slate-400">بدون نمره</span>
        )}
      </div>
    </div>
  );
}
