import { Suspense } from "react";

import { SessionsPage } from "@/components/panel/SessionsPage";
import { decodeCourseParam } from "@/lib/slug";

export default async function CourseSessionsRoute({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-muted" />}>
      <SessionsPage courseId={decodeCourseParam(courseId) ?? courseId} />
    </Suspense>
  );
}
