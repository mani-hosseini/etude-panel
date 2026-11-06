import { LeadDetailPage } from "@/components/admin/registration/LeadDetailPage";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminRegistrationLeadRoute({ params }: Props) {
  const { id } = await params;
  return <LeadDetailPage leadId={id} />;
}
