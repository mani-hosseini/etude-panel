import { redirect } from "next/navigation";

import { teacherRoutes } from "@/lib/routes";

export default function TeacherPracticeRoute() {
  redirect(teacherRoutes.students);
}
