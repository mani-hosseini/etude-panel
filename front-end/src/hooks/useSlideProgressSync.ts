"use client";

import { useEffect, useRef } from "react";

import { api } from "@/lib/api/client";

type Options = {
  sessionId: string;
  courseId?: string;
  enabled?: boolean;
  totalSlides: number;
  index: number;
  onRestore?: (index: number) => void;
};

/** Persists slide index to the backend (debounced) and restores on mount. */
export function useSlideProgressSync({
  sessionId,
  courseId,
  enabled = true,
  totalSlides,
  index,
  onRestore,
}: Options) {
  const restored = useRef(false);
  const lastSent = useRef<number | null>(null);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  useEffect(() => {
    if (!enabled || !sessionId || totalSlides <= 0 || restored.current) return;
    let cancelled = false;
    void api
      .sessionProgress(sessionId, courseId)
      .then((result) => {
        if (cancelled) return;
        restored.current = true;
        lastSent.current = result.lastSlideIndex;
        if (result.progressPercent > 0 && result.lastSlideIndex > 0) {
          onRestoreRef.current?.(result.lastSlideIndex);
        }
      })
      .catch(() => {
        restored.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, sessionId, courseId, totalSlides]);

  useEffect(() => {
    if (!enabled || !sessionId || totalSlides <= 0 || !restored.current) return;
    if (lastSent.current === index) return;

    const timer = window.setTimeout(() => {
      lastSent.current = index;
      void api.updateSessionProgress(sessionId, index, courseId).catch(() => {
        /* ignore */
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [enabled, sessionId, courseId, totalSlides, index]);
}