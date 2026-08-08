"use client";

import { SlideDeck } from "@/components/slides/SlideDeck";
import { courseSessions } from "@/lib/mock-data";
import { notFound } from "next/navigation";
import { use } from "react";

export default function SessionPlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const session = courseSessions.find((s) => s.id === id);

  if (!session || session.status !== "available") {
    notFound();
  }

  return (
    <SlideDeck
      mode="fullscreen"
      backHref={`/dashboard/sessions/${id}`}
    />
  );
}
