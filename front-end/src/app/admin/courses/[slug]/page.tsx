import { AdminCourseDetailPage } from "@/components/admin/AdminCourseDetailPage";

export default async function AdminCourseDetailRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <AdminCourseDetailPage courseSlug={slug} />;
}
