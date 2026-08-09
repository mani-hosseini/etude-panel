"use client";

import { notFound } from "next/navigation";

import { SlideDeck } from "@/components/slides/SlideDeck";
import { Skeleton } from "@/components/ui/skeleton";
import {
  queryErrorMessage,
  useSessionQuery,
  useSessionSlidesQuery,
} from "@/lib/api/queries";
import { toFa } from "@/lib/format";
import { routes } from "@/lib/routes";
import { toDeckSlides } from "@/lib/slides";

type SessionPlayViewProps = {
  sessionId: string;
  courseId?: string;
};

export function SessionPlayView({
  sessionId,
  courseId,
}: SessionPlayViewProps) {
  const sessionQuery = useSessionQuery(sessionId, courseId);
  const slidesEnabled =
    sessionQuery.isSuccess && sessionQuery.data.status === "available";
  const slidesQuery = useSessionSlidesQuery(
    sessionId,
    courseId,
    slidesEnabled,
  );

  if (sessionQuery.isPending || (slidesEnabled && slidesQuery.isPending)) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#01040a] text-white/70">
        <Skeleton className="h-8 w-40 bg-white/10" />
      </div>
    );
  }

  if (sessionQuery.isError) {
    throw new Error(queryErrorMessage(sessionQuery.error));
  }

  if (sessionQuery.data.status !== "available") {
    notFound();
  }

  if (slidesQuery.isError || !slidesQuery.data) {
    notFound();
  }

  const resolvedCourseId =
    courseId ?? sessionQuery.data.courseId ?? undefined;

  return (
    <SlideDeck
      mode="fullscreen"
      slides={toDeckSlides(slidesQuery.data.slides)}
      sessionLabel={`جلسه ${toFa(sessionQuery.data.number)}`}
      backHref={
        resolvedCourseId
          ? routes.courseSession(resolvedCourseId, sessionId)
          : routes.sessions
      }
    />
  );
}
