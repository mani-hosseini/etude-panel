import { TeacherAuthGate } from "@/components/teacher/TeacherAuthGate";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TeacherAuthGate>{children}</TeacherAuthGate>;
}
