import { Suspense } from "react";

import { NewTicketPage } from "@/components/panel/support/NewTicketPage";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewSupportTicketRoute() {
  return (
    <Suspense fallback={<Skeleton className="h-72 rounded-3xl" />}>
      <NewTicketPage />
    </Suspense>
  );
}
