import { redirect } from "next/navigation";

export default function CoursesRedirect() {
  redirect("/dashboard/sessions");
}
