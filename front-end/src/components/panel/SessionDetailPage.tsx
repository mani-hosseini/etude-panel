"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Images, Maximize2, NotebookPen, Presentation, UserRound } from "lucide-react";

import { PageHeader } from "@/components/panel/PageHeader";
import { SessionPager } from "@/components/panel/session/SessionPager";
import { SessionStatCards } from "@/components/panel/session/SessionStatCards";
import {
  SessionWorkspace,
  type SessionWorkspaceView,
} from "@/components/panel/session/SessionWorkspace";
import { Skeleton } from "@/components/ui/skeleton";
import { TermPills } from "@/components/ui/term-pills";
import {
  queryErrorMessage,
  useAssignmentsQuery,
  useCourseQuery,
  useSessionAttachmentsQuery,
  useSessionExercisesQuery,
  useSessionQuery,
  useSessionsQuery,
  useSessionSlidesQuery,
} from "@/lib/api/queries";
import { executionScoreLabel, toFa } from "@/lib/format";
import { routes, type SessionPlayViewKind } from "@/lib/routes";
import { decodeCourseParam } from "@/lib/slug";
import { homeworkForStudentSession, isSessionOpen } from "@/lib/session-access";
import { toDeckSlides } from "@/lib/slides";
import { parseTerm } from "@/lib/term";

function parseWorkspaceView(value: string | null): SessionWorkspaceView {
  if (value === "attachments" || value === "exercises") return value;
  return "slides";
}

function playViewOf(view: SessionWorkspaceView): SessionPlayViewKind | undefined {
  if (view === "slides") return undefined;
  return view;
}

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
  const queryCourseId = decodeCourseParam(searchParams.get("courseId"));
  const viewParam = parseWorkspaceView(searchParams.get("view"));
  const selectedTerm = parseTerm(searchParams.get("term"));
  const [workspaceView, setWorkspaceView] =
    useState<SessionWorkspaceView>(viewParam);

  useEffect(() => {
    setWorkspaceView(viewParam);
  }, [viewParam]);

  useEffect(() => {
    if (!courseId && queryCourseId) {
      router.replace(
        routes.courseSession(
          queryCourseId,
          sessionId,
          viewParam === "slides" ? undefined : viewParam,
          selectedTerm,
        ),
      );
    }
  }, [courseId, queryCourseId, sessionId, router, viewParam, selectedTerm]);

  const resolvedCourseId =
    decodeCourseParam(courseId) ?? queryCourseId ?? undefined;

  const sessionQuery = useSessionQuery(
    sessionId,
    resolvedCourseId,
    selectedTerm,
  );
  const slidesEnabled =
    sessionQuery.isSuccess && isSessionOpen(sessionQuery.data);
  const slidesQuery = useSessionSlidesQuery(
    sessionId,
    resolvedCourseId,
    slidesEnabled,
    selectedTerm,
  );
  const attachmentsQuery = useSessionAttachmentsQuery(
    sessionId,
    resolvedCourseId,
    slidesEnabled,
    selectedTerm,
  );
  const exercisesQuery = useSessionExercisesQuery(
    sessionId,
    resolvedCourseId,
    slidesEnabled,
    selectedTerm,
  );
  const courseQuery = useCourseQuery(resolvedCourseId, Boolean(resolvedCourseId));
  const sessionsQuery = useSessionsQuery(resolvedCourseId, selectedTerm);
  const assignmentsQuery = useAssignmentsQuery();

  useEffect(() => {
    if (courseId || queryCourseId) return;
    const slug = sessionQuery.data?.courseId;
    if (!slug) return;
    router.replace(
      routes.courseSession(
        slug,
        sessionId,
        viewParam === "slides" ? undefined : viewParam,
        selectedTerm,
      ),
    );
  }, [
    courseId,
    queryCourseId,
    sessionQuery.data?.courseId,
    sessionId,
    router,
    viewParam,
    selectedTerm,
  ]);

  if (!courseId && (queryCourseId || sessionQuery.data?.courseId)) {
    return <Skeleton className="h-64 rounded-3xl" />;
  }

  if (
    sessionQuery.isPending ||
    (resolvedCourseId && courseQuery.isPending) ||
    (slidesEnabled &&
      (slidesQuery.isPending ||
        attachmentsQuery.isPending ||
        exercisesQuery.isPending))
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
  const exercises = exercisesQuery.data?.exercises ?? [];
  const course = courseQuery.data ?? null;
  const pathCourseId =
    resolvedCourseId ?? session.courseId ?? course?.id ?? undefined;
  const courseTitle =
    slidesQuery.data?.courseTitle ??
    session.courseTitle ??
    course?.title ??
    "دوره";
  const sessionLabel = `جلسه ${toFa(session.number)}`;
  const sessions = sessionsQuery.data?.sessions ?? [];
  const term =
    selectedTerm ??
    session.term ??
    sessionsQuery.data?.selectedTerm ??
    sessionsQuery.data?.currentTerm;
  const sessionWork = homeworkForStudentSession(
    session,
    sessions,
    assignmentsQuery.data ?? [],
    term,
  );
  const assigned = sessionWork[0];
  const pager = (
    <SessionPager
      courseId={pathCourseId}
      sessions={sessions}
      currentNumber={session.number}
      view={workspaceView === "slides" ? undefined : workspaceView}
      term={term}
    />
  );
  const selectView = (view: SessionWorkspaceView) => {
    setWorkspaceView(view);
    if (!pathCourseId) return;
    router.replace(
      routes.courseSession(
        pathCourseId,
        session.id,
        view === "slides" ? undefined : view,
        term,
      ),
      { scroll: false },
    );
  };

  if (!isSessionOpen(session)) {
    const absent = session.attendanceStatus === "absent";
    return (
      <div className="space-y-6">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={
              pathCourseId
                ? routes.courseSessions(pathCourseId, {
                    list: true,
                    term,
                  })
                : routes.sessions
            }
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand"
          >
            <ArrowRight className="size-3.5" />
            همه جلسات
          </Link>
          {pager}
        </div>
        <PageHeader
          eyebrow={`جلسه ${toFa(session.number)}`}
          title={session.title || `جلسه ${toFa(session.number)}`}
          description={
            absent
              ? "شما در این جلسه غایب بودید."
              : "محتوای این جلسه هنوز فعال نشده است."
          }
        />
        <div
          className={
            absent
              ? "surface-panel border-destructive/20 bg-destructive/5 px-6 py-16 text-center"
              : "surface-panel px-6 py-16 text-center"
          }
        >
          <p className={absent ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
            {absent
              ? "شما در این جلسه غایب بودید و تکلیفی برایتان ثبت نشده است."
              : "این جلسه پس از برگزاری کلاس در پنل قرار می‌گیرد."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Link
              href={
                pathCourseId
                  ? routes.courseSessions(pathCourseId, {
                      list: true,
                      term,
                    })
                  : routes.sessions
              }
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand"
            >
              <ArrowRight className="size-3.5" />
              همه جلسات
            </Link>
            {pager}
          </div>
          {pathCourseId && (sessionsQuery.data?.currentTerm ?? 1) > 1 ? (
            <TermPills
              className="mb-3"
              currentTerm={sessionsQuery.data?.currentTerm ?? 1}
              selectedTerm={term ?? 1}
              onChange={(next) =>
                router.replace(
                  routes.courseSession(
                    pathCourseId,
                    session.id,
                    workspaceView === "slides" ? undefined : workspaceView,
                    next,
                  ),
                )
              }
            />
          ) : null}
          <PageHeader
            eyebrow={`${courseTitle} · ترم ${toFa(term ?? 1)} · جلسه ${toFa(session.number)}`}
            title={session.title}
            description={
              session.attendanceStatus === "absent"
                ? "شما در این جلسه غایب بودید."
                : session.summary ===
                    "محتوای این جلسه پس از برگزاری کلاس فعال می‌شود."
                  ? session.homeworkTitle
                    ? `تکلیف این جلسه: ${session.homeworkTitle}`
                    : "این جلسه برگزار شده است."
                  : session.summary
            }
          />
          {session.attendanceStatus === "absent" ? (
            <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm leading-7 text-destructive">
              شما در این جلسه غایب بودید و تکلیفی برایتان ثبت نشده است.
            </div>
          ) : null}
        </div>
        {pathCourseId && workspaceView !== "exercises" ? (
          <Link
            href={routes.courseSessionPlay(
              pathCourseId,
              session.id,
              playViewOf(workspaceView),
              term,
            )}
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
              onSelect: () => selectView("slides"),
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
              onSelect: () => selectView("attachments"),
            },
            {
              id: "exercises",
              label: "تمارین",
              value:
                exercises.length > 0
                  ? `${toFa(exercises.length)} تمرین`
                  : "بدون تمرین",
              icon: NotebookPen,
              active: workspaceView === "exercises",
              onSelect: () => selectView("exercises"),
            },
          ]}
        />
      </motion.div>

      <SessionWorkspace
        view={workspaceView}
        slides={slides}
        attachments={attachments}
        exercises={exercises}
        sessionLabel={sessionLabel}
        sessionId={session.id}
        courseId={pathCourseId}
        homeworkTitle={assigned?.title || session.homeworkTitle}
        homeworkSource={assigned?.source || session.homeworkSource}
        homeworkNote={assigned?.note || session.homeworkNote}
        homework={sessionWork}
        absent={session.attendanceStatus === "absent"}
        playHref={
          pathCourseId
            ? routes.courseSessionPlay(
                pathCourseId,
                session.id,
                playViewOf(workspaceView),
                term,
              )
            : routes.sessions
        }
        backHref={
          pathCourseId
            ? routes.courseSession(
                pathCourseId,
                session.id,
                workspaceView === "slides" ? undefined : workspaceView,
                term,
              )
            : routes.sessions
        }
      />

      {session.attendanceStatus === "absent" ||
      slides.length === 0 ||
      sessionWork.length === 0 ? null : (
        <section className="grid gap-3 sm:grid-cols-2">
          {sessionWork.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-navy">{item.title}</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {item.category}
                </span>
              </div>
              {item.source || item.note ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.source || item.note}
                </p>
              ) : null}
              <p className="mt-3 font-sans text-sm tabular-nums text-navy">
                {executionScoreLabel(item.score)}
              </p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
