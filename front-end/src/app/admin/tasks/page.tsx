import { Suspense } from "react";

import { AdminTasksPage } from "@/components/admin/tasks/AdminTasksPage";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminTasksRoute() {
  return (
    <Suspense fallback={<Skeleton className="h-72 rounded-3xl" />}>
      <AdminTasksPage />
    </Suspense>
  );
}
