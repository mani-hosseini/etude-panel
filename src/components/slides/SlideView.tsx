"use client";

import { useState } from "react";

import {
  Anim,
  Body,
  Chapter,
  Meta,
  Panel,
  SlideShell,
  Title,
} from "@/components/slides/SlidePrimitives";
import type { Slide, Term } from "@/lib/session-1-slides";

const logo = "/etude-logo.png";

function BulletList({ items }: { items: string[] }) {
  const twoCol = items.length >= 5;
  return (
    <ul
      className={
        twoCol
          ? "grid grid-cols-2 gap-x-3 gap-y-1 text-[clamp(0.76rem,1.1vw,0.9rem)] leading-[1.45] text-white"
          : "space-y-1 text-[clamp(0.76rem,1.1vw,0.9rem)] leading-[1.45] text-white"
      }
    >
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#0056d2]" />
          <span className="min-w-0 wrap-break-word">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function TermChips({ terms }: { terms: Term[] }) {
  const twoCol = terms.length >= 4;
  return (
    <div
      className={
        twoCol ? "grid grid-cols-2 gap-1.5" : "flex flex-wrap gap-1.5"
      }
    >
      {terms.map((t) => (
        <div
          key={t.en}
          className="max-w-full rounded-full border border-white/95 bg-white/4 px-2.5 py-1 text-[clamp(0.72rem,1.05vw,0.85rem)] leading-snug"
        >
          <span className="font-display font-semibold text-blue-200">
            {t.en}
          </span>
          <span className="mx-1 text-white/20">·</span>
          <span className="text-white">{t.fa}</span>
        </div>
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="font-display mb-1.5 text-[10px] font-bold tracking-[0.12em] text-white sm:text-[11px]">
      {children}
    </div>
  );
}

function LargeImage({ slideId, hint }: { slideId: string; hint: string }) {
  const candidates = [
    `/slides/main1/${slideId}.png`,
    `/slides/main1/${slideId}.jpg`,
    `/slides/${slideId}.jpg`,
    `/slides/${slideId}.png`,
    `/slides/${slideId}.webp`,
  ];
  const [srcIndex, setSrcIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed || srcIndex >= candidates.length) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#0056d2]/40 bg-[#0056d2]/[0.07] px-4 py-6 text-center">
        <div className="font-display text-[13px] font-bold text-[#9bc2ff]">
          جای عکس
        </div>
        <p className="max-w-[48ch] text-[clamp(0.85rem,1.2vw,1rem)] leading-relaxed text-[#8ba0c0]">
          {hint}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-1.5 sm:p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={candidates[srcIndex]}
        alt={hint}
        className="h-full max-h-full w-auto max-w-full object-contain"
        onError={() => {
          if (srcIndex + 1 < candidates.length) setSrcIndex((i) => i + 1);
          else setFailed(true);
        }}
      />
    </div>
  );
}

function CoverSlide({ slide }: { slide: Slide }) {
  return (
    <SlideShell className="items-center justify-center px-2">
      <div className="mx-auto flex max-w-[520px] flex-col items-center text-center">
        <Anim>
          <div className="relative mb-2">
            <div className="absolute inset-0 scale-[1.25] rounded-full bg-[#0056d2]/25 blur-2xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo}
              alt="لوگوی آموزشگاه اتود"
              className="relative size-12 rounded-full object-cover ring-1 ring-[#0056d2]/55 sm:size-14"
            />
          </div>
        </Anim>
        <Anim>
          <Title
            as="h1"
            className="mb-1.5! max-w-[28ch] !text-[clamp(1.05rem,2.4vw,1.55rem)]"
          >
            {slide.title}
          </Title>
        </Anim>
        <Anim>
          <p className="mx-auto max-w-[40ch] text-[clamp(0.82rem,1.2vw,0.95rem)] leading-[1.7] text-white/90">
            {slide.body}
          </p>
        </Anim>
      </div>
    </SlideShell>
  );
}

function LessonSlide({ slide }: { slide: Slide }) {
  return (
    <SlideShell wide className="gap-1.5">
      <Chapter n={slide.chapter} label="جلسهٔ اول" />
      <Title>{slide.title}</Title>

      <Anim className="shrink-0">
        <div className="rounded-xl border border-[#0056d2]/20 bg-[#0056d2]/10 px-3 py-1.5">
          <span className="font-display text-[10px] font-bold text-white sm:text-[11px]">
            هدف ·{" "}
          </span>
          <span className="text-[clamp(0.78rem,1.15vw,0.92rem)] leading-relaxed text-white">
            {slide.goal}
          </span>
        </div>
      </Anim>

      <Anim className="min-h-0 shrink">
        <p className="line-clamp-3 text-[clamp(0.82rem,1.25vw,0.98rem)] leading-[1.65] text-white/95 sm:line-clamp-4">
          {slide.body}
        </p>
      </Anim>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 sm:items-start">
        <Anim className="min-h-0">
          <Panel className="p-2.5! sm:p-3!">
            <SectionLabel>نکات کلیدی</SectionLabel>
            <BulletList items={slide.bullets} />
          </Panel>
        </Anim>
        <Anim className="min-h-0">
          <Panel className="p-2.5! sm:p-3!" strong>
            <SectionLabel>اصطلاحات</SectionLabel>
            <TermChips terms={slide.terms} />
          </Panel>
        </Anim>
      </div>

      {slide.funFact ? (
        <Meta>
          <span className="font-display font-semibold text-[#9bc2ff]">
            آیا می‌دانستید؟{" "}
          </span>
          {slide.funFact}
        </Meta>
      ) : null}
    </SlideShell>
  );
}

function VisualSlide({ slide }: { slide: Slide }) {
  return (
    <SlideShell wide className="pb-0!">
      <Anim className="flex h-full min-h-0 w-full flex-1">
        <LargeImage
          slideId={slide.imageId ?? slide.id}
          hint={slide.imageHint ?? slide.body}
        />
      </Anim>
    </SlideShell>
  );
}

function OutroSlide({ slide }: { slide: Slide }) {
  return (
    <SlideShell className="gap-1.5">
      <Chapter n={slide.chapter} label="پایان جلسهٔ اول" />
      <Title>{slide.title}</Title>
      <Body className="mb-1! max-w-[78ch]! line-clamp-3">{slide.body}</Body>

      <Anim className="min-h-0 flex-1">
        <div className="grid h-full gap-1.5 sm:grid-cols-2">
          {slide.bullets.map((b) => (
            <div
              key={b}
              className="rounded-xl border border-white/95 bg-white/4 px-3 py-2 text-[clamp(0.8rem,1.15vw,0.95rem)] text-white"
            >
              {b}
            </div>
          ))}
        </div>
      </Anim>

      <Anim className="shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TermChips terms={slide.terms} />
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo}
              alt="اتود"
              className="size-9 rounded-full object-cover"
            />
            <div>
              <div className="font-display text-[12px] font-bold text-white sm:text-[13px]">
                آموزشگاه موسیقی اتود
              </div>
              <div className="text-[10px] text-white/70">
                Masterclass · Session 01
              </div>
            </div>
          </div>
        </div>
      </Anim>

      {slide.funFact ? <Meta>{slide.funFact}</Meta> : null}
    </SlideShell>
  );
}

export function SlideView({ slide }: { slide: Slide }) {
  if (slide.kind === "cover") return <CoverSlide slide={slide} />;
  if (slide.kind === "visual") return <VisualSlide slide={slide} />;
  if (slide.kind === "outro") return <OutroSlide slide={slide} />;
  return <LessonSlide slide={slide} />;
}
