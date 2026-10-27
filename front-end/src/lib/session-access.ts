import type { CourseSession } from "@/lib/api/types";

export function isSessionOpen(
  session: Pick<
    CourseSession,
    "status" | "attendanceStatus" | "slideCount" | "attachmentCount"
  >,
) {
  if (session.attendanceStatus === "absent") return true;
  if (session.status === "available") return true;
  return (
    (session.slideCount ?? 0) > 0 || (session.attachmentCount ?? 0) > 0
  );
}
