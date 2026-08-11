import type { LessonStatus, ScheduleLesson } from "@/lib/api/types";

type WithStatus = { status: LessonStatus };

/**
 * Sliding window: last held session + next upcoming session.
 * When session 2 is done → show [2, 3]; when none done → show [next, following].
 */
export function pickScheduleWindow<T extends WithStatus>(lessons: T[]): T[] {
  if (lessons.length === 0) return [];

  let lastDoneIdx = -1;
  for (let i = 0; i < lessons.length; i += 1) {
    if (lessons[i].status === "done") lastDoneIdx = i;
  }
  const nextIdx = lessons.findIndex((l) => l.status === "next");

  if (lastDoneIdx >= 0 && nextIdx >= 0) {
    return [lessons[lastDoneIdx], lessons[nextIdx]];
  }
  if (lastDoneIdx >= 0) {
    const following = lessons[lastDoneIdx + 1];
    return following
      ? [lessons[lastDoneIdx], following]
      : [lessons[lastDoneIdx]];
  }
  if (nextIdx >= 0) {
    const following = lessons[nextIdx + 1];
    return following ? [lessons[nextIdx], following] : [lessons[nextIdx]];
  }
  return lessons.slice(0, 2);
}

export function scheduleLessonLabel(status: LessonStatus): string {
  if (status === "done") return "برگزار شده";
  if (status === "next") return "جلسه بعدی";
  return "برنامهٔ آینده";
}

export type ScheduleWindowLesson = Pick<
  ScheduleLesson,
  "id" | "title" | "day" | "time" | "dateLabel" | "status"
>;
