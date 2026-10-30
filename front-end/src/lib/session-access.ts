import type {
  CourseSession,
  SessionHomeworkItem,
  StudentAssignment,
} from "@/lib/api/types";

export function teacherSessionStatus(attendance?: string | null) {
  if (attendance && attendance !== "absent") return "available";
  return "locked";
}

export function isSessionOpen(
  session: Pick<
    CourseSession,
    "status" | "attendanceStatus" | "slideCount" | "attachmentCount"
  >,
) {
  if (session.attendanceStatus === "absent") return true;
  return session.status === "available";
}

/** Last held/open session the student can actually enter. */
export function studentHomeSession<T extends CourseSession>(
  sessions: T[],
): T | undefined {
  if (sessions.length === 0) return undefined;
  const open = sessions.filter((item) => isSessionOpen(item));
  const withHomework = open.filter(
    (item) =>
      (item.homework?.length ?? 0) > 0 || Boolean(item.homeworkTitle?.trim()),
  );
  const pickLatest = (list: T[]) =>
    [...list].sort((a, b) => b.number - a.number)[0];
  return (
    pickLatest(withHomework) ??
    pickLatest(open) ??
    sessions.find((item) => item.current) ??
    [...sessions].sort((a, b) => a.number - b.number)[0]
  );
}

function toHomeworkItem(
  item: SessionHomeworkItem | StudentAssignment,
): SessionHomeworkItem {
  return {
    id: item.id,
    category: item.category,
    title: item.title,
    source: item.source,
    note: item.note,
    score: item.score ?? 0,
  };
}

/** Homework for this class session, including items saved on the next locked session. */
export function homeworkForStudentSession(
  session: Pick<CourseSession, "id" | "uuid" | "number" | "homework">,
  sessions: CourseSession[],
  assignments: StudentAssignment[] = [],
  term?: number,
): SessionHomeworkItem[] {
  const next = sessions.find((item) => item.number === session.number + 1);
  const ids = new Set(
    [session.uuid, session.id, next?.uuid, next?.id].filter(Boolean),
  );
  const fromSession = session.homework ?? [];
  const fromNext =
    next && !isSessionOpen(next) ? (next.homework ?? []) : [];
  const fromAssignments = assignments.filter((item) => {
    if (term != null && item.term != null && item.term !== term) return false;
    if (item.sessionId && ids.has(item.sessionId)) return true;
    if (item.sessionNumber === session.number) return true;
    if (next && !isSessionOpen(next) && item.sessionNumber === next.number) {
      return true;
    }
    return false;
  });
  const seen = new Set<string>();
  const list: SessionHomeworkItem[] = [];
  for (const item of [...fromSession, ...fromNext, ...fromAssignments]) {
    const mapped = toHomeworkItem(item);
    if (seen.has(mapped.id)) continue;
    seen.add(mapped.id);
    list.push(mapped);
  }
  return list;
}
