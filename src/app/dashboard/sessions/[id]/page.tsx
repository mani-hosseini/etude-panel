import { SessionDetailPage } from "@/components/panel/SessionDetailPage";

export default async function SessionRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SessionDetailPage sessionId={id} />;
}
