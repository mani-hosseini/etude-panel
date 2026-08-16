"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Images, Maximize2, X } from "lucide-react";

import { DeckNavArrow } from "@/components/slides/DeckNavArrow";
import { useDeck } from "@/components/slides/useDeck";
import { resolveMediaUrl } from "@/lib/api/http";
import type { SessionAttachment } from "@/lib/api/types";
import { toFa } from "@/lib/format";
import { cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

const variants = {
  enter: (dir: number) => ({ opacity: 0, y: dir > 0 ? 18 : -18 }),
  center: { opacity: 1, y: 0, transition: { duration: 0.45, ease } },
  exit: (dir: number) => ({
    opacity: 0,
    y: dir > 0 ? -12 : 12,
    transition: { duration: 0.28, ease },
  }),
};

type AttachmentGalleryProps = {
  attachments: SessionAttachment[];
  sessionLabel: string;
  className?: string;
  mode?: "embedded" | "fullscreen";
  playHref?: string;
  backHref?: string;
};

export function AttachmentGallery({
  attachments,
  sessionLabel,
  className,
  mode = "embedded",
  playHref,
  backHref,
}: AttachmentGalleryProps) {
  const total = attachments.length;
  const { index, direction, next, prev } = useDeck(Math.max(total, 1), true, {
    capturePageKeys: mode === "fullscreen",
  });
  const item = attachments[index];
  const progress = total > 0 ? ((index + 1) / total) * 100 : 0;
  const src = resolveMediaUrl(item?.path);
  const caption = item?.caption || item?.filename || "پیوست جلسه";

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
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[#01040a]" />
        <div className="absolute top-[-20%] left-1/2 h-[70vmax] w-[70vmax] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,86,210,0.34)_0%,rgba(0,86,210,0.08)_35%,transparent_68%)]" />
      </div>

      <header className="relative z-30 shrink-0 bg-[#01040a]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-360 items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {mode === "fullscreen" && backHref ? (
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-xs text-white/80 hover:bg-white/8"
              >
                <ArrowRight className="size-3.5" />
                بازگشت
              </Link>
            ) : playHref ? (
              <Link
                href={playHref}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-xs text-white/80 hover:bg-white/8"
              >
                <Maximize2 className="size-3.5" />
                تمام‌صفحه
              </Link>
            ) : null}
            <div className="min-w-0">
              <p className="font-display text-sm font-bold tracking-[0.14em]">اتود</p>
              <p className="truncate font-sans text-[11px] text-white/60">
                {sessionLabel} · فایل‌های پیوست
              </p>
            </div>
          </div>
          <div className="font-sans flex items-baseline gap-2 rounded-full border border-white/8 bg-white/3 px-3 py-1.5 text-sm font-bold tabular-nums">
            <span>{toFa(String(Math.min(index + 1, total || 1)).padStart(2, "0"))}</span>
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

      <main className="relative z-10 min-h-0 flex-1">
        {total === 0 || !src ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-white/6 text-white/70">
              <Images className="size-6" />
            </span>
            <p className="text-sm text-white/70">هنوز فایلی برای این جلسه پیوست نشده است.</p>
          </div>
        ) : (
          <AnimatePresence mode="wait" custom={direction}>
            <motion.section
              key={item.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 flex items-center justify-center px-3 py-3 sm:px-6"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={caption}
                className="max-h-full max-w-full rounded-2xl object-contain shadow-[0_24px_80px_-32px_rgba(0,0,0,0.8)]"
              />
            </motion.section>
          </AnimatePresence>
        )}
      </main>

      <nav
        className="relative z-30 flex shrink-0 justify-center px-2 pb-2 pt-0.5"
        aria-label="ناوبری فایل‌های پیوست"
      >
        <div className="flex w-full max-w-360 items-center gap-1.5 rounded-full border border-white/10 bg-white/4 px-1.5 py-1 backdrop-blur-md sm:gap-2 sm:px-2">
          <DeckNavArrow
            onClick={prev}
            disabled={index === 0 || total <= 1}
            label="عکس قبلی"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-center gap-1.5">
              <span className="font-sans shrink-0 text-[11px] font-bold tabular-nums">
                {toFa(total === 0 ? 0 : index + 1)}
                <span className="mx-0.5 font-normal text-white/25">/</span>
                <span className="font-normal text-gray-400">{toFa(total)}</span>
              </span>
              <span className="truncate text-[10px] text-gray-400/70">{caption}</span>
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
            disabled={index >= total - 1 || total <= 1}
            label="عکس بعدی"
            flip
          />
        </div>
      </nav>

      {mode === "fullscreen" && backHref ? (
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
