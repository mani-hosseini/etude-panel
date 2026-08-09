import { Suspense } from "react";

import { SessionDetailPage } from "@/components/panel/SessionDetailPage";

export default async function SessionRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-muted" />}>
      <SessionDetailPage sessionId={id} />
    </Suspense>
  );
}
