"use client";

import {
  Award,
  BookOpen,
  ClipboardCheck,
  LayoutDashboard,
  Route,
  UserRound,
} from "lucide-react";

import { copy } from "@/constants/copy";
import { routes } from "@/lib/routes";

export const panelNavItems = [
  { href: routes.dashboard, label: copy.nav.dashboard, icon: LayoutDashboard },
  { href: routes.path, label: copy.nav.path, icon: Route },
  { href: routes.courses, label: copy.nav.courses, icon: BookOpen },
  { href: routes.exams, label: copy.nav.exams, icon: ClipboardCheck },
  { href: routes.certificates, label: copy.nav.certificates, icon: Award },
  { href: routes.profile, label: copy.nav.profile, icon: UserRound },
] as const;

export const mobileNavItems = [
  { href: routes.dashboard, label: copy.nav.dashboard, icon: LayoutDashboard },
  { href: routes.path, label: copy.nav.path, icon: Route },
  { href: routes.courses, label: copy.nav.courses, icon: BookOpen },
  { href: routes.profile, label: copy.nav.profile, icon: UserRound },
] as const;
