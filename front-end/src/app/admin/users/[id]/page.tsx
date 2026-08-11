import { AdminUserDetailPage } from "@/components/admin/AdminUserDetailPage";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserDetailRoute({ params }: Props) {
  const { id } = await params;
  return <AdminUserDetailPage userId={id} />;
}
