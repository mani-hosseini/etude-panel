import { Suspense } from "react";

import { SessionsPage } from "@/components/panel/SessionsPage";

export default function SessionsRoute() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-muted" />}>
      <SessionsPage />
    </Suspense>
  );
}
