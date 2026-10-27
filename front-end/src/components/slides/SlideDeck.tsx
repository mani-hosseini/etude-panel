"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Maximize2, Music2, NotebookPen, X } from "lucide-react";

import { SlideView } from "@/components/slides/SlideView";
import { DeckNavArrow } from "@/components/slides/DeckNavArrow";
import { useDeck } from "@/components/slides/useDeck";
import { useSlideProgressSync } from "@/hooks/useSlideProgressSync";
import { executionScoreLabel, toFa } from "@/lib/format";
import type { SessionHomeworkItem } from "@/lib/api/types";
import { slides as defaultSlides, type Slide } from "@/lib/session-1-slides";
import { cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

const slideVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    y: dir > 0 ? 18 : -18,
  }),
  center: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease },
  },
  exit: (dir: number) => ({
    opacity: 0,
    y: dir > 0 ? -12 : 12,
    transition: { duration: 0.28, ease },
  }),
};

type SlideDeckProps = {
  mode?: "embedded" | "fullscreen";
  backHref?: string;
  className?: string;
  slides?: Slide[];
  sessionLabel?: string;
  playHref?: string;
  sessionId?: string;
  courseId?: string;
  homeworkTitle?: string;
  homeworkSource?: string;
  homeworkNote?: string;
  homework?: SessionHomeworkItem[];
  absent?: boolean;
};

export function SlideDeck({
  mode = "embedded",
  backHref = "/dashboard/sessions",
  className,
  slides = defaultSlides,
  sessionLabel = "جلسهٔ اول",
  playHref = "/dashboard/sessions/1/play",
  sessionId,
  courseId,
  homeworkTitle,
  homeworkSource,
  homeworkNote,
  homework = [],
  absent = false,
}: SlideDeckProps) {
  const total = slides.length;
  const { index, direction, next, prev, goTo } = useDeck(total, true, {
    capturePageKeys: mode === "fullscreen",
  });
  const { farthestIndex } = useSlideProgressSync({
    sessionId: sessionId ?? "",
    courseId,
    enabled: Boolean(sessionId),
    totalSlides: total,
    index,
    onRestore: (i) => goTo(i, i > 0 ? 1 : -1),
  });

  if (total === 0) {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden bg-[#01040a] px-6 text-center",
          mode === "fullscreen"
            ? "fixed inset-0 z-80 h-dvh"
            : "min-h-[min(42vh,340px)] rounded-3xl",
          className,
        )}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute top-[-20%] left-1/2 h-[70vmax] w-[70vmax] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,86,210,0.28)_0%,rgba(0,86,210,0.08)_35%,transparent_68%)]" />
        </div>
        {absent ? (
          <div className="relative max-w-md rounded-3xl border border-white/10 bg-white/5 px-8 py-8 backdrop-blur-sm">
            <p className="text-base font-semibold text-white">
              شما در این جلسه غایب بودید
            </p>
            <p className="mt-2 text-sm leading-7 text-white/60">
              برای این جلسه تکلیفی برایتان ثبت نشده است.
            </p>
          </div>
        ) : homework.length > 0 ? (
          <div className="relative w-full max-w-3xl py-8 text-right">
            <div className="mb-4 flex items-center justify-between gap-3 px-1">
              <p className="text-[11px] font-medium tracking-wide text-brand-300">
                تکلیف این جلسه · {toFa(homework.length)} مورد
              </p>
              <span className="flex size-10 items-center justify-center rounded-2xl bg-brand/25 ring-1 ring-brand/40">
                <NotebookPen className="size-4 text-white" />
              </span>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {homework.map((item) => (
                <li
                  key={item.id}
                  className="rounded-3xl border border-white/10 bg-white/6 px-5 py-5 text-right shadow-[0_20px_60px_-28px_rgba(0,71,255,0.55)] backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-lg font-bold leading-8 text-white">
                      {item.title}
                    </p>
                    <span className="shrink-0 rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-white/70 ring-1 ring-white/10">
                      {item.category}
                    </span>
                  </div>
                  {item.source ? (
                    <p className="mt-2 text-xs text-white/60">{item.source}</p>
                  ) : null}
                  {item.note ? (
                    <p className="mt-3 rounded-2xl bg-black/25 px-4 py-3 text-sm leading-8 text-white/80">
                      {item.note}
                    </p>
                  ) : null}
                  <p className="mt-3 font-sans text-sm tabular-nums text-white/80">
                    {executionScoreLabel(item.score)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : homeworkTitle || homeworkNote ? (
          <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-white/6 px-7 py-8 text-right shadow-[0_20px_60px_-28px_rgba(0,71,255,0.55)] backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium tracking-wide text-brand-300">
                تکلیف این جلسه
              </p>
              <span className="flex size-10 items-center justify-center rounded-2xl bg-brand/25 ring-1 ring-brand/40">
                <NotebookPen className="size-4 text-white" />
              </span>
            </div>
            {homeworkTitle ? (
              <p className="text-xl font-bold leading-8 text-white">
                {homeworkTitle}
              </p>
            ) : null}
            {homeworkSource ? (
              <p className="mt-2 inline-flex rounded-full bg-white/8 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
                {homeworkSource}
              </p>
            ) : null}
            {homeworkNote ? (
              <p className="mt-4 rounded-2xl bg-black/25 px-4 py-3 text-sm leading-8 text-white/80">
                {homeworkNote}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="relative max-w-md rounded-3xl border border-white/10 bg-white/5 px-8 py-8">
            <Music2 className="mx-auto mb-3 size-6 text-white/35" />
            <p className="text-sm text-white/70">
              هنوز تکلیفی برای این جلسه ثبت نشده است.
            </p>
          </div>
        )}
      </div>
    );
  }

  const slide = slides[index]!;
  const progress =
    total > 0 ? ((Math.max(index, farthestIndex) + 1) / total) * 100 : 0;
  const label =
    slide.kind === "visual"
      ? `${slide.title} · تصویر`
      : slide.kind === "cover"
        ? "شروع"
        : slide.kind === "outro"
          ? "پایان"
          : slide.title;

  return (
    <div
      className={cn(
        "relative flex flex-col bg-[#01040a] text-white touch-manipulation",
        mode === "fullscreen"
          ? "fixed inset-0 z-80 h-dvh overflow-hidden overscroll-none"
          : "h-[min(72vh,700px)] overflow-clip rounded-3xl",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[#01040a]" />
        <div className="absolute top-[-20%] left-1/2 h-[70vmax] w-[70vmax] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,86,210,0.34)_0%,rgba(0,86,210,0.08)_35%,transparent_68%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_35%_at_100%_100%,rgba(0,62,168,0.2),transparent_55%)]" />
      </div>

      <header className="relative z-30 shrink-0 bg-[#01040a]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-360 items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {mode === "fullscreen" ? (
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-xs text-white/80 hover:bg-white/8"
              >
                <ArrowRight className="size-3.5" />
                بازگشت
              </Link>
            ) : (
              <Link
                href={playHref}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-xs text-white/80 hover:bg-white/8"
              >
                <Maximize2 className="size-3.5" />
                تمام‌صفحه
              </Link>
            )}
            <div className="min-w-0">
              <p className="font-display text-sm font-bold tracking-[0.14em]">
                اتود
              </p>
              <p className="truncate font-sans text-[11px] text-white/60">
                {sessionLabel}
              </p>
            </div>
          </div>
          <div className="font-sans flex items-baseline gap-2 rounded-full border border-white/8 bg-white/3 px-3 py-1.5 text-sm font-bold tabular-nums">
            <span>{toFa(String(index + 1).padStart(2, "0"))}</span>
            <span className="text-white/15">/</span>
            <span className="text-[#8ba0c0]">{toFa(total)}</span>
          </div>
        </div>
        <div className="h-px w-full overflow-hidden bg-white/5">
          <motion.div
            className="h-full bg-linear-to-l from-[#3b84ff] via-[#0056d2] to-[#003ea8]"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.55, ease }}
          />
        </div>
      </header>

      <main className="relative z-10 min-h-0 flex-1 outline-none" tabIndex={0}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.section
            key={slide.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 overflow-clip px-3 sm:px-5 lg:px-6"
          >
            <div className="mx-auto flex h-full w-full max-w-360 items-stretch justify-center py-2">
              <SlideView slide={slide} sessionLabel={sessionLabel} />
            </div>
          </motion.section>
        </AnimatePresence>
      </main>

      <nav
        className="relative z-30 flex shrink-0 justify-center px-2 pb-2 pt-0.5"
        aria-label="ناوبری اسلایدها"
      >
        <div className="flex w-full max-w-360 items-center gap-1.5 rounded-full border border-white/10 bg-white/4 px-1.5 py-1 backdrop-blur-md sm:gap-2 sm:px-2">
          <DeckNavArrow onClick={prev} disabled={index === 0} label="اسلاید قبلی" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-center gap-1.5">
              <span className="font-sans shrink-0 text-[11px] font-bold tabular-nums">
                {toFa(index + 1)}
                <span className="mx-0.5 font-normal text-white/25">/</span>
                <span className="font-normal text-gray-400">
                  {toFa(total)}
                </span>
              </span>
              <span className="truncate text-[10px] text-gray-400/70">
                {label}
              </span>
            </div>
            <div className="mx-1 mt-0.5 h-0.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-linear-to-l from-[#3b84ff] to-[#0056d2]"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.35, ease }}
              />
            </div>
          </div>

          <DeckNavArrow
            onClick={next}
            disabled={index === total - 1}
            label="اسلاید بعدی"
            flip
          />
        </div>
      </nav>

      {mode === "fullscreen" ? (
        <Link
          href={backHref}
          className="absolute left-3 top-3 z-40 grid size-9 place-items-center rounded-full border border-white/10 bg-white/5 text-white/80 backdrop-blur sm:hidden"
          aria-label="بستن"
        >
          <X className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}
