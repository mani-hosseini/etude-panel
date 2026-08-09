import { notFound } from "next/navigation";

import { AdminSessionSlidesPage } from "@/components/admin/AdminSessionSlidesPage";

export default async function AdminSessionSlidesRoute({
  params,
}: {
  params: Promise<{ slug: string; sessionNumber: string }>;
}) {
  const { slug, sessionNumber: raw } = await params;
  const sessionNumber = Number(raw);
  if (!Number.isFinite(sessionNumber) || sessionNumber < 1) {
    notFound();
  }
  return (
    <AdminSessionSlidesPage
      courseSlug={slug}
      sessionNumber={sessionNumber}
    />
  );
}
