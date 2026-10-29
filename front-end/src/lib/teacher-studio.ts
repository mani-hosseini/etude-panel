export function studentDisplayName(student: {
  firstName: string;
  lastName: string;
  displayName?: string;
}) {
  return student.displayName?.trim() || `${student.firstName} ${student.lastName}`;
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

export function assignmentsForSession<
  T extends {
    sessionId?: string | null;
    sessionNumber?: number | null;
    classId?: string | null;
  },
>(
  assignments: T[],
  session: { id: string; number: number; courseId?: string | null } | null,
) {
  if (!session) return [];
  return assignments.filter((item) => {
    if (item.sessionId && item.sessionId === session.id) return true;
    if (item.sessionNumber !== session.number) return false;
    if (!item.classId || !session.courseId) return true;
    return item.classId === session.courseId;
  });
}

/** Stay on the last held class until its homework is saved; then open the next. */
export function defaultTeacherSessionId(
  sessions: Array<{
    id: string;
    number: number;
    attendance: string | null;
    current?: boolean;
  }>,
  assignments: Array<{ sessionId?: string | null; sessionNumber?: number | null }> = [],
): string {
  if (sessions.length === 0) return "";
  const lastHeld = sessions
    .filter((item) => item.attendance && item.attendance !== "absent")
    .sort((a, b) => b.number - a.number)[0];
  if (lastHeld) {
    const savedOnHeld = assignments.some(
      (item) =>
        item.sessionId === lastHeld.id ||
        item.sessionNumber === lastHeld.number,
    );
    if (savedOnHeld) {
      const next = sessions.find((item) => item.number === lastHeld.number + 1);
      return next?.id ?? lastHeld.id;
    }
    return lastHeld.id;
  }
  const current = sessions
    .filter((item) => item.current)
    .sort((a, b) => b.number - a.number)[0];
  if (current) return current.id;
  return [...sessions].sort((a, b) => a.number - b.number)[0]!.id;
}
