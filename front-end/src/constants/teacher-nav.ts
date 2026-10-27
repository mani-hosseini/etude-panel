import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  UserRound,
  Users,
} from "lucide-react";

import { teacherRoutes } from "@/lib/routes";

export const teacherNavItems = [
  { href: teacherRoutes.root, label: "صفحه اصلی", icon: LayoutDashboard },
  { href: teacherRoutes.class, label: "کلاس امروز", icon: ClipboardList },
  { href: teacherRoutes.students, label: "هنرجویان", icon: Users },
  { href: teacherRoutes.schedule, label: "برنامه کلاس", icon: CalendarDays },
  { href: teacherRoutes.profile, label: "پروفایل", icon: UserRound },
] as const;
