import { AttendanceStatus } from '@prisma/client';

export function courseUnlocksByClassHeld(course: {
  slug?: string | null;
  instrument?: string | null;
  title?: string | null;
}) {
  const blob = `${course.slug ?? ''} ${course.instrument ?? ''} ${course.title ?? ''}`;
  return !/theory|تئوری/i.test(blob);
}

export function classWasHeld(
  attendance?: AttendanceStatus | string | null,
) {
  const value = String(attendance ?? '').toUpperCase();
  return (
    value === AttendanceStatus.PRESENT || value === AttendanceStatus.LATE
  );
}

export function studentFacingSessionStatus(
  attendance?: AttendanceStatus | string | null,
): 'available' | 'locked' {
  return classWasHeld(attendance) ? 'available' : 'locked';
}

function isAbsentAttendance(attendance?: string | null) {
  return String(attendance ?? '').toLowerCase() === 'absent';
}

/**
 * Homework assigned on session N is graded on the next held class.
 * Consecutive absences are skipped so unfinished homework keeps rolling
 * forward (e.g. HW on 4 → absent 5 → grade on 6).
 * Session 1 of term 2+ reviews the last session of the previous term.
 */
export function previousSessionForReview<
  T extends {
    id: string;
    number: number;
    courseId?: string | null;
    attendance?: string | null;
  },
>(
  sessions: T[],
  current: T | null | undefined,
  term = 1,
): T | null {
  if (!current || sessions.length === 0) return null;
  const courseSessions = sessions
    .filter(
      (item) =>
        !current.courseId || !item.courseId || item.courseId === current.courseId,
    )
    .sort((a, b) => a.number - b.number);
  if (courseSessions.length === 0) return null;

  let candidate =
    courseSessions.find((item) => item.number === current.number - 1) ?? null;
  let wrappedToPriorTerm = false;

  if (!candidate) {
    const last = courseSessions[courseSessions.length - 1]!;
    if (
      current.number === 1 &&
      term > 1 &&
      last.id !== current.id &&
      last.number > 1
    ) {
      candidate = last;
      wrappedToPriorTerm = true;
    }
  }

  // Walk back through absent meetings so the last held homework is reviewed.
  // Do not apply this walk on term-wrap candidates (attendance is term-scoped).
  if (!wrappedToPriorTerm) {
    while (candidate && isAbsentAttendance(candidate.attendance)) {
      candidate =
        courseSessions.find((item) => item.number === candidate!.number - 1) ??
        null;
    }
  }

  return candidate;
}
