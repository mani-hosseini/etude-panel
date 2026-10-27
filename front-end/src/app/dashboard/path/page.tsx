import { Suspense } from "react";

import { PianoPathPage } from "@/components/panel/PianoPathPage";
import { Skeleton } from "@/components/ui/skeleton";

export default function PathPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      }
    >
      <PianoPathPage />
    </Suspense>
  );
}
