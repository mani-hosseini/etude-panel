"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  Music2,
  Phone,
  Star,
} from "lucide-react";

import { TeacherSessionScores } from "@/components/teacher/TeacherSessionScores";
import { TeacherSessionWork } from "@/components/teacher/TeacherSessionWork";
import { TeacherStudentLevel } from "@/components/teacher/TeacherStudentLevel";
import { TeacherStudentStars } from "@/components/teacher/TeacherStudentStars";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { TermPills } from "@/components/ui/term-pills";
import { UserAvatar } from "@/components/ui/user-avatar";
import { audienceError } from "@/lib/api/errors";
import { type StudioAssignment } from "@/lib/api/studio";
import { useStudioStudentQuery } from "@/lib/api/studio-queries";
import { formatDays, toFa } from "@/lib/format";
import {
  PATH_TRACKS,
  averageTracksFromItems,
} from "@/lib/piano-path";
import { teacherRoutes } from "@/lib/routes";
import {
  assignmentsForSession,
  defaultTeacherSessionId,
  previousSessionForReview,
  studentDisplayName,
} from "@/lib/teacher-studio";

export function TeacherStudentDetail({
  id,
  from,
}: {
  id: string;
  requestedSession?: string;
  from?: string;
}) {
  const [studentKey, setStudentKey] = useState(id);
  const [term, setTerm] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState("");
  const query = useStudioStudentQuery(id, term ?? undefined);
  const sessions = query.data?.sessions;
  const fromClass = from === "class";

  if (studentKey !== id) {
    setStudentKey(id);
    setTerm(null);
    setSessionId("");
  }

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 rounded-3xl" />
        <div className="grid gap-4 xl:grid-cols-[1.6fr_0.9fr]">
          <Skeleton className="h-96 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {audienceError(query.error, "پرونده هنرجو یافت نشد.")}
      </div>
    );
  }

  const student = query.data;
  const currentTerm = student.currentTerm ?? 1;
  const selectedTerm = student.selectedTerm ?? term ?? currentTerm;
  const name = studentDisplayName(student);
  const classLabel =
    student.classDays && student.classDays.length > 0
      ? `${student.classTitle ?? student.classId} · ${formatDays(student.classDays)}`
      : (student.classTitle ?? student.classId);
  const sessionList = sessions ?? [];
  const termAssignments = (student.assignments ?? []).filter(
    (item) => item.term == null || item.term === selectedTerm,
  );
  const resolvedSessionId =
    sessionId && sessionList.some((item) => item.id === sessionId)
      ? sessionId
      : defaultTeacherSessionId(sessionList, termAssignments);
  if (resolvedSessionId && resolvedSessionId !== sessionId) {
    setSessionId(resolvedSessionId);
  }
  const session =
    sessionList.find((item) => item.id === resolvedSessionId) ?? null;
  const reviewSession = previousSessionForReview(
    sessionList,
    session,
    student.currentTerm != null ? selectedTerm : 2,
  );
  const reviewTerm =
    session?.reviewTerm ??
    (session?.number === 1 && selectedTerm > 1
      ? selectedTerm - 1
      : selectedTerm);
  const reviewAssignments = assignmentsForSession(
    student.assignments ?? [],
    reviewSession,
    reviewTerm,
  );
  const reviewingWrappedLast =
    Boolean(session && reviewSession && session.number === 1 && reviewSession.number > 1);
  const showReview = reviewAssignments.length > 0 || (Boolean(reviewSession) && !reviewingWrappedLast);
  const absent = session?.attendance === "absent";

  return (
    <div className="space-y-6">
      <Link
        href={fromClass ? teacherRoutes.class : teacherRoutes.students}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-navy"
      >
        <ArrowRight className="size-3.5" />
        {fromClass ? "بازگشت به کلاس امروز" : "بازگشت به هنرجویان"}
      </Link>

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="bg-navy px-5 py-5 text-white sm:px-6 sm:py-6">
          <p className="text-[11px] font-medium tracking-wide text-white/55">
            پرونده هنرجو
          </p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3.5">
              <UserAvatar
                className="size-14 rounded-2xl ring-white/20"
                avatarUrl={student.avatarUrl}
                alt={name}
              />
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  {name}
                </h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
                  <span className="inline-flex items-center gap-1.5">
                    <Music2 className="size-3.5" />
                    {student.piece}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" />
                    {classLabel}
                  </span>
                  <span>
                    ترم {toFa(selectedTerm)}
                    {student.sessionsTotal
                      ? ` · ${toFa(student.sessionsTotal)} جلسه`
                      : ""}
                  </span>
                </p>
                <TermPills
                  className="mt-3"
                  tone="onDark"
                  currentTerm={currentTerm}
                  selectedTerm={selectedTerm}
                  onChange={(next) => {
                    setTerm(next);
                    setSessionId("");
                  }}
                />
              </div>
            </div>
            <div className="shrink-0 sm:pt-1">
              <TeacherStudentStars
                studentId={student.id}
                stars={student.stars ?? 0}
                tone="onDark"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-border sm:grid-cols-3">
          <MetaCell label="سطح هنرجو">
            <TeacherStudentLevel studentId={student.id} level={student.level} />
          </MetaCell>
          <MetaCell label="حضور">
            <p className="font-sans text-lg font-semibold tabular-nums text-navy">
              {toFa(student.attendanceRate)}٪
            </p>
            <Progress value={student.attendanceRate} className="mt-2" />
          </MetaCell>
          <MetaCell label="تماس">
            <p
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy"
              dir="ltr"
            >
              <Phone className="size-3.5 text-muted-foreground" />
              {student.phone ? toFa(student.phone) : "—"}
            </p>
          </MetaCell>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(17rem,0.85fr)]">
        <article className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
              <ClipboardCheck className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-navy">کار جلسه</h2>
              <p className="mt-0.5 text-xs leading-6 text-muted-foreground">
                حضور را مشخص کنید و تکلیف همین جلسه را ثبت کنید. نمره تمرین‌های
                جلسه قبل در ستون کنار ثبت می‌شود.
              </p>
            </div>
          </div>
          <TeacherSessionWork
            key={`${student.id}-${selectedTerm}`}
            studentId={student.id}
            sessions={sessionList}
            assignments={termAssignments}
            sessionId={resolvedSessionId}
            term={student.currentTerm != null ? selectedTerm : undefined}
            onSessionIdChange={setSessionId}
            onLastSessionSaved={() => {
              if (selectedTerm >= currentTerm) {
                setTerm(null);
                setSessionId("");
              }
            }}
          />
        </article>

        <aside className="space-y-4">
          <article className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <div className="mb-3 flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-navy">
                <Star className="size-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-navy">
                  {showReview && reviewSession
                    ? `امتیاز تمرین جلسه ${toFa(reviewSession.number)}${
                        reviewTerm !== selectedTerm
                          ? ` ترم ${toFa(reviewTerm)}`
                          : ""
                      }`
                    : "امتیاز تمرین جلسه قبل"}
                </h2>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  {showReview && reviewSession
                    ? `تکلیف جلسه ${toFa(reviewSession.number)} را در این کلاس نمره بدهید؛ تمرین تازه روی همین جلسه ثبت می‌شود.`
                    : "نمره تمرین‌ها از جلسه بعد ثبت می‌شود"}
                </p>
              </div>
            </div>
            <TeacherSessionScores
              studentId={student.id}
              session={session}
              sessions={sessionList}
              assignments={student.assignments ?? []}
              term={student.currentTerm != null ? selectedTerm : 2}
              disabled={absent}
            />
          </article>

          <article className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h2 className="text-sm font-semibold text-navy">میانگین چهار محور</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              از نمره‌های ثبت‌شده همین هنرجو
            </p>
            <StudentTrackAverages
              studentId={student.id}
              assignments={student.assignments ?? []}
            />
          </article>
        </aside>
      </div>
    </div>
  );
}

function MetaCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card px-5 py-4">
      <p className="mb-2 text-[11px] font-medium text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function StudentTrackAverages({
  studentId,
  assignments,
}: {
  studentId: string;
  assignments: StudioAssignment[];
}) {
  const tracks = averageTracksFromItems(
    assignments.map((item) => {
      const target = item.targets.find((row) => row.studentId === studentId);
      return {
        category: item.category,
        score: target?.score ?? item.progress,
        progress: target?.progress ?? item.progress,
      };
    }),
  );

  return (
    <ul className="mt-4 space-y-3">
      {PATH_TRACKS.map((track) => (
        <li key={track.key}>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{track.label}</span>
            <span className="font-sans text-sm font-semibold tabular-nums text-navy">
              {toFa(tracks[track.key])}
            </span>
          </div>
          <Progress value={tracks[track.key]} />
        </li>
      ))}
    </ul>
  );
}
