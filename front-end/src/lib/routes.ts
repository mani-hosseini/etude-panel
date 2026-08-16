/** Clean dashboard paths — courseId is the public slug (e.g. theory-basics). */

export type SessionPlayViewKind = "slides" | "attachments";

function withSessionView(path: string, view?: SessionPlayViewKind) {
  if (view === "attachments") return `${path}?view=attachments`;
  return path;
}

export const routes = {
  dashboard: "/dashboard",
  courses: "/dashboard/courses",
  course: (courseId: string) => `/dashboard/courses/${courseId}`,
  courseSessions: (courseId: string) =>
    `/dashboard/courses/${courseId}/sessions`,
  courseSession: (
    courseId: string,
    sessionId: string,
    view?: SessionPlayViewKind,
  ) =>
    withSessionView(
      `/dashboard/courses/${courseId}/sessions/${sessionId}`,
      view,
    ),
  courseSessionPlay: (
    courseId: string,
    sessionId: string,
    view?: SessionPlayViewKind,
  ) =>
    withSessionView(
      `/dashboard/courses/${courseId}/sessions/${sessionId}/play`,
      view,
    ),
  courseSchedule: (courseId: string) =>
    `/dashboard/courses/${courseId}/schedule`,
  /** Nav default: primary enrolled course */
  sessions: "/dashboard/sessions",
  schedule: "/dashboard/schedule",
  certificates: "/dashboard/certificates",
  profile: "/dashboard/profile",
  login: "/login",
  register: "/",
} as const;

export const adminRoutes = {
  root: "/admin",
  login: "/admin/login",
  users: "/admin/users",
  user: (id: string) => `/admin/users/${id}`,
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
  if (href === routes.certificates) {
    return pathname === routes.certificates || pathname.includes("/certificate");
  }
  if (href === routes.courses) {
    return pathname === routes.courses;
  }
  if (href === adminRoutes.root) {
    return pathname === adminRoutes.root;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
