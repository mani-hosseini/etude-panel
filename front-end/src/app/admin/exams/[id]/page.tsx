import { AdminExamEditorPage } from "@/components/admin/AdminExamEditorPage";

export default async function AdminExamDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminExamEditorPage examId={id} />;
}
