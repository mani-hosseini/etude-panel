import { AdminCourseFormPage } from "@/components/admin/AdminCourseFormPage";

export default async function AdminCourseEditRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <AdminCourseFormPage courseId={slug} />;
}
