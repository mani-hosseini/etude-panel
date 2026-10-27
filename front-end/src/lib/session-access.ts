import type { CourseSession } from "@/lib/api/types";

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
