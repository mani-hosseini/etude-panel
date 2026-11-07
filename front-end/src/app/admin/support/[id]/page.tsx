import { AdminTicketDetailPage } from "@/components/admin/support/AdminTicketDetailPage";

export default async function AdminSupportTicketRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminTicketDetailPage ticketId={id} />;
}
