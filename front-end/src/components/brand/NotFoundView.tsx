"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Home, Music2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { StaffBackdrop } from "@/components/auth/StaffBackdrop";
import { EtudeLogo } from "@/components/brand/EtudeLogo";
import { PianoKeysBar } from "@/components/brand/PianoKeysBar";
import { routes } from "@/lib/routes";

const ease = [0.22, 1, 0.36, 1] as const;

export function NotFoundView() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <StaffBackdrop />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center px-4 py-12">
        <motion.div
          className="mb-8 flex flex-col items-center text-center"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease }}
        >
          <EtudeLogo size={88} priority glow />
          <p className="mt-4 font-display text-xs font-bold tracking-[0.28em] text-brand">
            ETUDE ACADEMY
          </p>
        </motion.div>

        <motion.section
          className="relative w-full overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 px-6 py-10 text-center shadow-[0_30px_80px_-40px_rgba(0,54,196,0.45)] backdrop-blur-md sm:px-12 sm:py-12"
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.06, ease }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -left-16 -top-20 size-56 rounded-full bg-brand/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -right-10 size-56 rounded-full bg-navy/10 blur-3xl"
          />

          <p className="relative font-display text-[6.5rem] font-bold leading-none tracking-tight text-brand sm:text-[8rem]">
            404
          </p>
          <div className="relative mx-auto mt-1 h-px w-28 bg-linear-to-l from-transparent via-brand/40 to-transparent" />

          <div className="relative mx-auto mt-6 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand">
            <Music2 className="size-5" strokeWidth={1.75} />
          </div>

          <h1 className="relative mt-5 text-2xl font-bold text-navy sm:text-3xl">
            این نت روی حامل نیست
          </h1>
          <p className="relative mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
            صفحه‌ای که دنبالش بودی در آکادمی اتود پیدا نشد. لینک ممکن است جابه‌جا
            شده باشد یا دیگر وجود نداشته باشد.
          </p>

          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={routes.register}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-6 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(0,71,255,0.65)] transition hover:bg-brand-600"
            >
              <Home className="size-4" strokeWidth={1.75} />
              صفحه اصلی
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href={routes.login}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-white px-6 text-sm font-semibold text-navy transition hover:border-brand-200 hover:bg-brand-50"
            >
              ورود به پنل
              <ArrowLeft className="size-4" />
            </Link>
          </div>

          <PianoKeysBar className="relative mx-auto mt-10 max-w-xs" />
        </motion.section>
      </div>
    </div>
  );
}
