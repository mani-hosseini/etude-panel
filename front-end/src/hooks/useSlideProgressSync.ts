"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/queries";

type Options = {
  sessionId: string;
  courseId?: string;
  enabled?: boolean;
  totalSlides: number;
  index: number;
  onRestore?: (index: number) => void;
};

function invalidateProgressViews(
  queryClient: QueryClient,
  sessionId: string,
  courseId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  void queryClient.invalidateQueries({ queryKey: queryKeys.courses });
  void queryClient.invalidateQueries({ queryKey: ["sessions"] });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.session(sessionId, courseId),
  });
  void queryClient.invalidateQueries({ queryKey: ["schedule"] });
  if (courseId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.course(courseId),
    });
  } else {
    void queryClient.invalidateQueries({ queryKey: ["course"] });
  }
}

function persistFarthest(
  sessionId: string,
  slideIndex: number,
  courseId: string | undefined,
  queryClient: QueryClient,
) {
  return api
    .updateSessionProgress(sessionId, slideIndex, courseId)
    .then(() => {
      invalidateProgressViews(queryClient, sessionId, courseId);
    })
    .catch(() => {
      /* ignore */
    });
}

/** Persists farthest viewed slide (debounced) and restores on mount. */
export function useSlideProgressSync({
  sessionId,
  courseId,
  enabled = true,
  totalSlides,
  index,
  onRestore,
}: Options) {
  const queryClient = useQueryClient();
  const restored = useRef(false);
  const farthestSent = useRef<number | null>(null);
  const indexRef = useRef(index);
  const sessionIdRef = useRef(sessionId);
  const courseIdRef = useRef(courseId);
  const enabledRef = useRef(enabled);
  const queryClientRef = useRef(queryClient);
  const onRestoreRef = useRef(onRestore);
  const [farthestIndex, setFarthestIndex] = useState(0);

  indexRef.current = index;
  sessionIdRef.current = sessionId;
  courseIdRef.current = courseId;
  enabledRef.current = enabled;
  queryClientRef.current = queryClient;
  onRestoreRef.current = onRestore;

  useEffect(() => {
    setFarthestIndex((prev) => Math.max(prev, index));
  }, [index]);

  useEffect(() => {
    if (!enabled || !sessionId || totalSlides <= 0 || restored.current) return;
    let cancelled = false;
    void api
      .sessionProgress(sessionId, courseId)
      .then((result) => {
        if (cancelled) return;
        restored.current = true;
        const completedFar =
          result.progressPercent >= 100 && totalSlides > 0
            ? totalSlides - 1
            : 0;
        const saved = Math.max(result.lastSlideIndex, completedFar);
        farthestSent.current = saved;
        setFarthestIndex((prev) => Math.max(prev, saved));
        if (result.lastSlideIndex > 0) {
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
    const known = farthestSent.current;
    if (known !== null && index <= known) return;

    const timer = window.setTimeout(() => {
      const slideIndex = index;
      farthestSent.current = slideIndex;
      void persistFarthest(sessionId, slideIndex, courseId, queryClient);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [enabled, sessionId, courseId, totalSlides, index, queryClient]);

  // Flush any pending farther slide when leaving the deck.
  useEffect(() => {
    return () => {
      if (!enabledRef.current || !restored.current) return;
      const id = sessionIdRef.current;
      if (!id) return;
      const slideIndex = indexRef.current;
      const known = farthestSent.current;
      if (known !== null && slideIndex <= known) return;

      farthestSent.current = slideIndex;
      void persistFarthest(
        id,
        slideIndex,
        courseIdRef.current,
        queryClientRef.current,
      );
    };
  }, []);

  return { farthestIndex };
}
