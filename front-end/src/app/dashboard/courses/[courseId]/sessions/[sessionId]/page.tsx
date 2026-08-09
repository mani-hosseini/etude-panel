import { Suspense } from "react";

import { SessionDetailPage } from "@/components/panel/SessionDetailPage";

export default async function CourseSessionRoute({
  params,
}: {
  params: Promise<{ courseId: string; sessionId: string }>;
}) {
  const { courseId, sessionId } = await params;
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-muted" />}>
      <SessionDetailPage sessionId={sessionId} courseId={courseId} />
    </Suspense>
  );
}
