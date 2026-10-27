import { redirect } from "next/navigation";

import { decodeCourseParam } from "@/lib/slug";
import { routes } from "@/lib/routes";

export default async function CourseScheduleRedirect({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const slug = decodeCourseParam(courseId) ?? courseId;
  redirect(routes.courseSessions(slug, { list: true }));
}
