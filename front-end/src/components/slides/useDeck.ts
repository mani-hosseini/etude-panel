"use client";

import { useCallback, useEffect, useState } from "react";

import { TOTAL_SLIDES } from "@/lib/session-1-slides";

type UseDeckOptions = {
  /** Space / PageUp / PageDown / Home / End navigate the deck instead of the page. */
  capturePageKeys?: boolean;
};

export function useDeck(
  total = TOTAL_SLIDES,
  enabled = true,
  options: UseDeckOptions = {},
) {
  const capturePageKeys = options.capturePageKeys ?? false;
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [busy, setBusy] = useState(false);

  const goTo = useCallback(
    (next: number, dir?: number) => {
      if (!enabled || busy) return;
      if (next < 0 || next >= total || next === index) return;
      setBusy(true);
      setDirection(dir ?? (next > index ? 1 : -1));
      setIndex(next);
      window.setTimeout(() => setBusy(false), 520);
    },
    [busy, enabled, index, total],
  );

  const next = useCallback(() => goTo(index + 1, 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1, -1), [goTo, index]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const isPageKey =
        e.key === " " ||
        e.key === "PageDown" ||
        e.key === "PageUp" ||
        e.key === "Home" ||
        e.key === "End";
      if (isPageKey && !capturePageKeys) return;

      if (e.key === "ArrowLeft" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (
        e.key === "ArrowRight" ||
        e.key === "PageUp" ||
        e.key === "Backspace"
      ) {
        e.preventDefault();
        prev();
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0, -1);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(total - 1, 1);
      }
    };

    let startX = 0;
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.changedTouches[0]!.clientX;
      startY = e.changedTouches[0]!.clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0]!.clientX - startX;
      const dy = e.changedTouches[0]!.clientY - startY;
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) next();
      else prev();
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [capturePageKeys, enabled, goTo, next, prev, total]);

  return { index, direction, next, prev, goTo, busy };
}
