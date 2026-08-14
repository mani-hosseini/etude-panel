"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Images, Maximize2, Presentation, UserRound } from "lucide-react";

import { PageHeader } from "@/components/panel/PageHeader";
import { SessionStatCards } from "@/components/panel/session/SessionStatCards";
import {
  SessionWorkspace,
  type SessionWorkspaceView,
} from "@/components/panel/session/SessionWorkspace";
import { Skeleton } from "@/components/ui/skeleton";
import {
  queryErrorMessage,
  useCourseQuery,
  useSessionAttachmentsQuery,
  useSessionQuery,
  useSessionSlidesQuery,
} from "@/lib/api/queries";
import { toFa } from "@/lib/format";
import { routes } from "@/lib/routes";
import { toDeckSlides } from "@/lib/slides";

export function SessionDetailPage({
  sessionId,
  courseId,
}: {
  sessionId: string;
  courseId?: string;
}) {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryCourseId = searchParams.get("courseId");
  const [workspaceView, setWorkspaceView] =
    useState<SessionWorkspaceView>("slides");

  useEffect(() => {
    if (!courseId && queryCourseId) {
      router.replace(routes.courseSession(queryCourseId, sessionId));
    }
  }, [courseId, queryCourseId, sessionId, router]);

  const resolvedCourseId = courseId ?? queryCourseId ?? undefined;

  const sessionQuery = useSessionQuery(sessionId, resolvedCourseId);
  const slidesEnabled =
    sessionQuery.isSuccess && sessionQuery.data.status === "available";
  const slidesQuery = useSessionSlidesQuery(
    sessionId,
    resolvedCourseId,
    slidesEnabled,
  );
  const attachmentsQuery = useSessionAttachmentsQuery(
    sessionId,
    resolvedCourseId,
    slidesEnabled,
  );
  const courseQuery = useCourseQuery(resolvedCourseId, Boolean(resolvedCourseId));

  useEffect(() => {
    if (courseId || queryCourseId) return;
    const slug = sessionQuery.data?.courseId;
    if (!slug) return;
    router.replace(routes.courseSession(slug, sessionId));
  }, [courseId, queryCourseId, sessionQuery.data?.courseId, sessionId, router]);

  if (!courseId && (queryCourseId || sessionQuery.data?.courseId)) {
    return <Skeleton className="h-64 rounded-3xl" />;
  }

  if (
    sessionQuery.isPending ||
    (resolvedCourseId && courseQuery.isPending) ||
    (slidesEnabled && (slidesQuery.isPending || attachmentsQuery.isPending))
  ) {
    return <Skeleton className="h-64 rounded-3xl" />;
  }

  if (sessionQuery.isError) {
    const message = queryErrorMessage(sessionQuery.error);
    if (message.includes("یافت نشد")) notFound();
    return (
      <div className="surface-panel p-8 text-center text-sm text-destructive">
        {message}
      </div>
    );
  }

  const session = sessionQuery.data;
  const slides =
    slidesQuery.isSuccess && slidesQuery.data
      ? toDeckSlides(slidesQuery.data.slides)
      : [];
  const attachments = attachmentsQuery.data?.attachments ?? [];
  const course = courseQuery.data ?? null;
  const pathCourseId =
    resolvedCourseId ?? session.courseId ?? course?.id ?? undefined;
  const courseTitle =
    slidesQuery.data?.courseTitle ??
    session.courseTitle ??
    course?.title ??
    "دوره";
  const sessionLabel = `جلسه ${toFa(session.number)}`;

  if (session.status !== "available") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={`جلسه ${toFa(session.number)}`}
          title={session.title || `جلسه ${toFa(session.number)}`}
          description="محتوای این جلسه هنوز فعال نشده است."
        />
        <div className="surface-panel px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            این جلسه پس از برگزاری کلاس در پنل قرار می‌گیرد.
          </p>
          <Link
            href={
              pathCourseId
                ? routes.courseSessions(pathCourseId)
                : routes.sessions
            }
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand"
          >
            <ArrowRight className="size-4" />
            بازگشت به جلسات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={
              pathCourseId
                ? routes.courseSessions(pathCourseId)
                : routes.sessions
            }
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand"
          >
            <ArrowRight className="size-3.5" />
            همه جلسات
          </Link>
          <PageHeader
            eyebrow={`${courseTitle} · جلسه ${toFa(session.number)}`}
            title={session.title}
            description={session.summary}
          />
        </div>
        {pathCourseId ? (
          <Link
            href={routes.courseSessionPlay(pathCourseId, session.id)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-navy px-4 py-3 text-sm font-semibold text-white shadow-lift transition hover:bg-navy-soft"
          >
            <Maximize2 className="size-4" />
            پخش تمام‌صفحه
          </Link>
        ) : null}
      </div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <SessionStatCards
          items={[
            {
              id: "teacher",
              label: "مدرس",
              value: course?.teacherShort || "—",
              icon: UserRound,
            },
            {
              id: "slides",
              label: "تعداد اسلاید",
              value: toFa(slides.length),
              icon: Presentation,
              active: workspaceView === "slides",
              onSelect: () => setWorkspaceView("slides"),
            },
            {
              id: "attachments",
              label: "فایل و عکس‌های پیوست",
              value:
                attachments.length > 0
                  ? `${toFa(attachments.length)} فایل`
                  : "بدون فایل",
              icon: Images,
              active: workspaceView === "attachments",
              onSelect: () => setWorkspaceView("attachments"),
            },
          ]}
        />
      </motion.div>

      <SessionWorkspace
        view={workspaceView}
        slides={slides}
        attachments={attachments}
        sessionLabel={sessionLabel}
        sessionId={session.id}
        courseId={pathCourseId}
        playHref={
          pathCourseId
            ? routes.courseSessionPlay(pathCourseId, session.id)
            : routes.sessions
        }
        backHref={
          pathCourseId
            ? routes.courseSession(pathCourseId, session.id)
            : routes.sessions
        }
      />
    </div>
  );
}
