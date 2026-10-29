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

/** Homework assigned on session N is graded on session N+1. Session 1 reviews the last session. */
export function previousSessionForReview<
  T extends { id: string; number: number; courseId?: string | null },
>(sessions: T[], current: T | null | undefined): T | null {
  if (!current || sessions.length === 0) return null;
  const courseSessions = sessions
    .filter(
      (item) =>
        !current.courseId || !item.courseId || item.courseId === current.courseId,
    )
    .sort((a, b) => a.number - b.number);
  if (courseSessions.length === 0) return null;
  const previous = courseSessions.find(
    (item) => item.number === current.number - 1,
  );
  if (previous) return previous;
  const last = courseSessions[courseSessions.length - 1]!;
  if (current.number === 1 && last.id !== current.id && last.number > 1) {
    return last;
  }
  return null;
}
