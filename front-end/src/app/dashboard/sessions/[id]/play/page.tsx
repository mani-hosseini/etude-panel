"use client";

import { use, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SessionPlayView } from "@/components/panel/SessionPlayView";
import { routes } from "@/lib/routes";

function LegacyPlayContent({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId") ?? undefined;

  useEffect(() => {
    if (courseId) {
      router.replace(routes.courseSessionPlay(courseId, sessionId));
    }
  }, [courseId, sessionId, router]);

  if (courseId) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#01040a] text-white/70">
        در حال بارگذاری…
      </div>
    );
  }

  return <SessionPlayView sessionId={sessionId} />;
}

export default function SessionPlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-[#01040a] text-white/70">
          در حال بارگذاری…
        </div>
      }
    >
      <LegacyPlayContent sessionId={id} />
    </Suspense>
  );
}
