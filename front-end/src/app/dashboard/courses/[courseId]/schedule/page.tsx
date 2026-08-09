import { SchedulePage } from "@/components/panel/SchedulePage";

export default async function CourseScheduleRoute({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <SchedulePage courseId={courseId} />;
}
