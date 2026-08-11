"use client";

import { useEffect, useRef } from "react";
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

/** Persists slide index to the backend (debounced) and restores on mount. */
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
  const lastSent = useRef<number | null>(null);
  const indexRef = useRef(index);
  const sessionIdRef = useRef(sessionId);
  const courseIdRef = useRef(courseId);
  const enabledRef = useRef(enabled);
  const queryClientRef = useRef(queryClient);
  const onRestoreRef = useRef(onRestore);

  indexRef.current = index;
  sessionIdRef.current = sessionId;
  courseIdRef.current = courseId;
  enabledRef.current = enabled;
  queryClientRef.current = queryClient;
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
      const slideIndex = index;
      lastSent.current = slideIndex;
      void api
        .updateSessionProgress(sessionId, slideIndex, courseId)
        .then(() => {
          invalidateProgressViews(queryClient, sessionId, courseId);
        })
        .catch(() => {
          /* ignore */
        });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [enabled, sessionId, courseId, totalSlides, index, queryClient]);

  // Flush any pending slide progress when leaving the deck.
  useEffect(() => {
    return () => {
      if (!enabledRef.current || !restored.current) return;
      const id = sessionIdRef.current;
      if (!id) return;
      const slideIndex = indexRef.current;
      if (lastSent.current === slideIndex) return;

      lastSent.current = slideIndex;
      const course = courseIdRef.current;
      const client = queryClientRef.current;
      void api
        .updateSessionProgress(id, slideIndex, course)
        .then(() => {
          invalidateProgressViews(client, id, course);
        })
        .catch(() => {
          /* ignore */
        });
    };
  }, []);
}
