import { redirect } from "next/navigation";

import { teacherRoutes } from "@/lib/routes";

export default function TeacherAttendanceRoute() {
  redirect(teacherRoutes.class);
}
