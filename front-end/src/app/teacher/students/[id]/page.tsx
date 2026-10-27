import { TeacherStudentDetail } from "@/components/teacher/TeacherStudentDetail";

export default async function TeacherStudentRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session?: string; from?: string }>;
}) {
  const { id } = await params;
  const { session, from } = await searchParams;
  return (
    <TeacherStudentDetail id={id} requestedSession={session} from={from} />
  );
}
