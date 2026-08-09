"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease },
  },
};

export function SlideShell({
  children,
  wide = false,
  className,
}: {
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className={cn(
        "relative mx-auto flex h-full min-h-0 w-full flex-col overflow-hidden",
        wide ? "max-w-350" : "max-w-260",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function Anim({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={item} className={cn("min-w-0", className)}>
      {children}
    </motion.div>
  );
}

export function Chapter({ n, label }: { n: string; label: string }) {
  return (
    <Anim>
      <div className="mb-1.5 flex shrink-0 items-center gap-2">
        <span className="font-sans rounded-full border border-[#3b84ff]/35 bg-[#0056d2]/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#9bc2ff] tabular-nums sm:text-[11px]">
          {n}
        </span>
        <span className="h-px w-3 bg-white/15" />
        <p className="font-sans text-[10px] font-semibold text-[#c8d4ea]/90 sm:text-[11px]">
          {label}
        </p>
      </div>
    </Anim>
  );
}

export function Title({
  children,
  as: Tag = "h2",
  className,
}: {
  children: ReactNode;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <Anim className="shrink-0">
      <Tag
        className={cn(
          "font-sans mb-1.5 font-extrabold leading-tight tracking-tight text-balance text-white",
          Tag === "h1"
            ? "bg-linear-to-b from-white via-[#e4ecff] to-[#8eb6ff] bg-clip-text text-[clamp(1.05rem,2.2vw,1.55rem)] text-transparent"
            : "text-[clamp(1rem,2vw,1.45rem)]",
          className,
        )}
      >
        {children}
      </Tag>
    </Anim>
  );
}

export function Body({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Anim className="min-h-0 shrink">
      <p
        className={cn(
          "mb-2 max-w-[78ch] font-sans text-[clamp(0.82rem,1.25vw,0.98rem)] leading-[1.65] text-[#8ba0c0]",
          className,
        )}
      >
        {children}
      </p>
    </Anim>
  );
}

export function Panel({
  children,
  className,
  strong = false,
}: {
  children: ReactNode;
  className?: string;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative min-h-0 overflow-hidden rounded-2xl p-2.5 shadow-[0_12px_40px_-20px_rgba(0,86,210,0.55)] sm:p-3",
        strong
          ? "border border-[#3b84ff]/45 bg-linear-to-br from-[#0056d2]/40 via-[#003ea8]/25 to-white/5"
          : "border border-white/15 bg-linear-to-br from-[#0a1628]/90 via-[#071018]/80 to-[#0056d2]/15",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-l from-transparent via-white/25 to-transparent"
      />
      <div className="relative z-1 min-h-0 min-w-0">{children}</div>
    </div>
  );
}

export function Meta({ children }: { children: ReactNode }) {
  return (
    <Anim className="shrink-0">
      <p className="mt-1.5 flex items-start gap-2 font-sans text-[clamp(0.72rem,1.1vw,0.85rem)] leading-relaxed text-[#c8d4ea]/90">
        <span className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-[#0056d2]" />
        <span className="min-w-0">{children}</span>
      </p>
    </Anim>
  );
}
