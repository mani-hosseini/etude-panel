export function studentDisplayName(student: {
  firstName: string;
  lastName: string;
  displayName?: string;
}) {
  return student.displayName?.trim() || `${student.firstName} ${student.lastName}`;
}

/** Homework assigned on session N is graded on session N+1. Session 1 of term 2+ reviews the last session of the previous term. */
export function previousSessionForReview<
  T extends { id: string; number: number; courseId?: string | null },
>(sessions: T[], current: T | null | undefined, term = 1): T | null {
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
  if (
    current.number === 1 &&
    term > 1 &&
    last.id !== current.id &&
    last.number > 1
  ) {
    return last;
  }
  return null;
}

export function assignmentsForSession<
  T extends {
    sessionId?: string | null;
    sessionNumber?: number | null;
    classId?: string | null;
    term?: number | null;
  },
>(
  assignments: T[],
  session: { id: string; number: number; courseId?: string | null } | null,
  term?: number,
) {
  if (!session) return [];
  return assignments.filter((item) => {
    if (term != null && item.term != null && item.term !== term) return false;
    if (item.sessionId && item.sessionId === session.id) {
      return term == null || item.term == null || item.term === term;
    }
    if (item.sessionNumber !== session.number) return false;
    if (!item.classId || !session.courseId) return true;
    return item.classId === session.courseId;
  });
}

/** Stay on the last held class until its homework is saved; then open the next. Absent sessions count as done and are skipped. */
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
  const byNumber = [...sessions].sort((a, b) => a.number - b.number);
  const lastHeld = [...byNumber]
    .reverse()
    .find((item) => item.attendance && item.attendance !== "absent");
  if (lastHeld) {
    const savedOnHeld = assignments.some(
      (item) =>
        item.sessionId === lastHeld.id ||
        item.sessionNumber === lastHeld.number,
    );
    if (savedOnHeld) {
      let next = byNumber.find((item) => item.number === lastHeld.number + 1);
      let lastAbsent = next?.attendance === "absent" ? next : undefined;
      while (next?.attendance === "absent") {
        lastAbsent = next;
        next = byNumber.find((item) => item.number === next!.number + 1);
      }
      return next?.id ?? lastAbsent?.id ?? lastHeld.id;
    }
    return lastHeld.id;
  }
  const firstOpen = byNumber.find((item) => item.attendance !== "absent");
  if (firstOpen) return firstOpen.id;
  const current = [...sessions]
    .filter((item) => item.current)
    .sort((a, b) => b.number - a.number)[0];
  if (current) return current.id;
  return byNumber[0]!.id;
}

export function nextOpenTeacherSessionId<
  T extends { id: string; number: number; attendance: string | null },
>(sessions: T[], from: T | null | undefined): string | undefined {
  if (!from) return undefined;
  const byNumber = [...sessions].sort((a, b) => a.number - b.number);
  let next = byNumber.find((item) => item.number === from.number + 1);
  while (next?.attendance === "absent") {
    next = byNumber.find((item) => item.number === next!.number + 1);
  }
  return next?.id;
}
