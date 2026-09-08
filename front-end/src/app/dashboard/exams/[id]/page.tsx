import { ExamDetailPage } from "@/components/panel/ExamDetailPage";

export default async function ExamDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExamDetailPage examId={id} />;
}
