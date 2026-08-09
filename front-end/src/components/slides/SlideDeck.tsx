"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Maximize2, X } from "lucide-react";

import { SlideView } from "@/components/slides/SlideView";
import { useDeck } from "@/components/slides/useDeck";
import { toFa } from "@/lib/format";
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

function NavArrow({
  onClick,
  disabled,
  flip = false,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  flip?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-7 shrink-0 place-items-center rounded-full text-white/80 transition hover:bg-white/8 hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-25"
    >
      <svg
        viewBox="0 0 24 24"
        width="13"
        height="13"
        className={flip ? "" : "rotate-180"}
        aria-hidden
      >
        <path
          fill="currentColor"
          d="M14.7 6.3a1 1 0 0 0-1.4 0l-6 6a1 1 0 0 0 0 1.4l6 6a1 1 0 1 0 1.4-1.4L9.42 13l5.28-5.3a1 1 0 0 0 0-1.4z"
        />
      </svg>
    </button>
  );
}

type SlideDeckProps = {
  mode?: "embedded" | "fullscreen";
  backHref?: string;
  className?: string;
  slides?: Slide[];
  sessionLabel?: string;
  playHref?: string;
};

export function SlideDeck({
  mode = "embedded",
  backHref = "/dashboard/sessions",
  className,
  slides = defaultSlides,
  sessionLabel = "جلسهٔ اول",
  playHref = "/dashboard/sessions/1/play",
}: SlideDeckProps) {
  const total = slides.length;
  const { index, direction, next, prev, goTo } = useDeck(total);
  const slide = slides[index]!;
  const progress = total > 0 ? ((index + 1) / total) * 100 : 0;
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
        "relative flex flex-col overflow-hidden overscroll-none bg-[#01040a] text-white touch-manipulation",
        mode === "fullscreen"
          ? "fixed inset-0 z-80 h-dvh"
          : "h-[min(72vh,700px)] rounded-3xl",
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
            className="absolute inset-0 overflow-hidden px-3 sm:px-5 lg:px-6"
          >
            <div className="mx-auto flex h-full w-full max-w-360 items-stretch justify-center py-2">
              <SlideView slide={slide} />
            </div>
          </motion.section>
        </AnimatePresence>
      </main>

      <nav
        className="relative z-30 flex shrink-0 justify-center px-2 pb-2 pt-0.5"
        aria-label="ناوبری اسلایدها"
      >
        <div className="flex w-full max-w-360 items-center gap-1.5 rounded-full border border-white/10 bg-white/4 px-1.5 py-1 backdrop-blur-md sm:gap-2 sm:px-2">
          <NavArrow onClick={prev} disabled={index === 0} label="اسلاید قبلی" />

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

          <NavArrow
            onClick={next}
            disabled={index === total - 1}
            label="اسلاید بعدی"
            flip
          />

          <label className="sr-only" htmlFor="slide-jump">
            پرش به اسلاید
          </label>
          <select
            id="slide-jump"
            value={index}
            onChange={(e) => goTo(Number(e.target.value))}
            className="font-sans max-w-22 shrink-0 truncate rounded-full border border-white/10 bg-white/4 px-2 py-0.5 text-[10px] text-gray-400 outline-none hover:bg-white/7"
          >
            {slides.map((s, i) => (
              <option key={s.id} value={i} className="bg-[#01040a] text-white">
                {toFa(i + 1)} · {s.kind === "visual" ? "تصویر" : s.title}
              </option>
            ))}
          </select>
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
