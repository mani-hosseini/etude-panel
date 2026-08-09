"use client";

import { use } from "react";
import { Suspense } from "react";

import { SessionPlayView } from "@/components/panel/SessionPlayView";

export default function CourseSessionPlayPage({
  params,
}: {
  params: Promise<{ courseId: string; sessionId: string }>;
}) {
  const { courseId, sessionId } = use(params);
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-[#01040a] text-white/70">
          در حال بارگذاری…
        </div>
      }
    >
      <SessionPlayView courseId={courseId} sessionId={sessionId} />
    </Suspense>
  );
}
