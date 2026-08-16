"use client";

import { notFound, useSearchParams } from "next/navigation";

import { AttachmentGallery } from "@/components/panel/session/AttachmentGallery";
import { SlideDeck } from "@/components/slides/SlideDeck";
import { Skeleton } from "@/components/ui/skeleton";
import {
  queryErrorMessage,
  useSessionAttachmentsQuery,
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
  const searchParams = useSearchParams();
  const view =
    searchParams.get("view") === "attachments" ? "attachments" : "slides";
  const sessionQuery = useSessionQuery(sessionId, courseId);
  const contentEnabled =
    sessionQuery.isSuccess && sessionQuery.data.status === "available";
  const slidesQuery = useSessionSlidesQuery(
    sessionId,
    courseId,
    contentEnabled && view === "slides",
  );
  const attachmentsQuery = useSessionAttachmentsQuery(
    sessionId,
    courseId,
    contentEnabled && view === "attachments",
  );

  const contentPending =
    view === "attachments" ? attachmentsQuery.isPending : slidesQuery.isPending;

  if (sessionQuery.isPending || (contentEnabled && contentPending)) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#01040a] text-white/70">
        <Skeleton className="h-8 w-40 bg-white/10" />
      </div>
    );
  }

  if (sessionQuery.isError) {
    const message = queryErrorMessage(sessionQuery.error);
    if (message.includes("یافت نشد")) notFound();
    return (
      <div className="flex h-dvh items-center justify-center bg-[#01040a] px-6 text-center text-sm text-white/80">
        {message}
      </div>
    );
  }

  if (sessionQuery.data.status !== "available") {
    notFound();
  }

  const resolvedCourseId =
    courseId ?? sessionQuery.data.courseId ?? undefined;
  const sessionLabel = `جلسه ${toFa(sessionQuery.data.number)}`;
  const backHref = resolvedCourseId
    ? routes.courseSession(
        resolvedCourseId,
        sessionId,
        view === "attachments" ? "attachments" : undefined,
      )
    : routes.sessions;

  if (view === "attachments") {
    if (attachmentsQuery.isError) {
      notFound();
    }

    return (
      <AttachmentGallery
        mode="fullscreen"
        attachments={attachmentsQuery.data?.attachments ?? []}
        sessionLabel={sessionLabel}
        backHref={backHref}
      />
    );
  }

  if (slidesQuery.isError || !slidesQuery.data) {
    notFound();
  }

  return (
    <SlideDeck
      mode="fullscreen"
      slides={toDeckSlides(slidesQuery.data.slides)}
      sessionLabel={sessionLabel}
      sessionId={sessionId}
      courseId={resolvedCourseId}
      backHref={backHref}
    />
  );
}
