import { TicketDetailPage } from "@/components/panel/support/TicketDetailPage";

export default async function SupportTicketRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TicketDetailPage ticketId={id} />;
}
