/** Clean dashboard paths — courseId is the public slug (e.g. theory-basics). */

export const routes = {
  dashboard: "/dashboard",
  courses: "/dashboard/courses",
  course: (courseId: string) => `/dashboard/courses/${courseId}`,
  courseSessions: (courseId: string) =>
    `/dashboard/courses/${courseId}/sessions`,
  courseSession: (courseId: string, sessionId: string) =>
    `/dashboard/courses/${courseId}/sessions/${sessionId}`,
  courseSessionPlay: (courseId: string, sessionId: string) =>
    `/dashboard/courses/${courseId}/sessions/${sessionId}/play`,
  courseSchedule: (courseId: string) =>
    `/dashboard/courses/${courseId}/schedule`,
  /** Nav default: primary enrolled course */
  sessions: "/dashboard/sessions",
  schedule: "/dashboard/schedule",
  profile: "/dashboard/profile",
  login: "/login",
  register: "/",
} as const;

export const adminRoutes = {
  root: "/admin",
  login: "/admin/login",
  users: "/admin/users",
  courses: "/admin/courses",
  courseNew: "/admin/courses/new",
  /** Prefer course slug in URLs, e.g. theory-basics */
  course: (slug: string) => `/admin/courses/${slug}`,
  courseEdit: (slug: string) => `/admin/courses/${slug}/edit`,
  /** Session content by course slug + session number */
  courseSession: (slug: string, sessionNumber: number | string) =>
    `/admin/courses/${slug}/sessions/${sessionNumber}`,
} as const;

export function isNavActive(pathname: string, href: string): boolean {
  if (href === routes.dashboard) return pathname === routes.dashboard;
  if (href === routes.sessions) {
    return pathname === routes.sessions || pathname.includes("/sessions");
  }
  if (href === routes.schedule) {
    return pathname === routes.schedule || pathname.includes("/schedule");
  }
  if (href === routes.courses) {
    return pathname === routes.courses;
  }
  if (href === adminRoutes.root) {
    return pathname === adminRoutes.root;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
