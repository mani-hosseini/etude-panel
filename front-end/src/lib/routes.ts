/** Clean dashboard paths — courseId is the public slug (e.g. theory-basics). */

export type SessionPlayViewKind = "slides" | "attachments" | "exercises";

function withSessionView(path: string, view?: SessionPlayViewKind) {
  if (view === "attachments" || view === "exercises") {
    return `${path}?view=${view}`;
  }
  return path;
}

export const routes = {
  dashboard: "/dashboard",
  path: "/dashboard/path",
  courses: "/dashboard/courses",
  course: (courseId: string) => `/dashboard/courses/${courseId}`,
  courseSessions: (courseId: string, opts?: { list?: boolean }) =>
    opts?.list
      ? `/dashboard/courses/${courseId}/sessions?list=1`
      : `/dashboard/courses/${courseId}/sessions`,
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
  /** Nav default: primary enrolled course */
  sessions: "/dashboard/sessions",
  certificates: "/dashboard/certificates",
  exams: "/dashboard/exams",
  exam: (id: string) => `/dashboard/exams/${id}`,
  profile: "/dashboard/profile",
  login: "/login",
  register: "/login",
} as const;

export const teacherRoutes = {
  root: "/teacher",
  class: "/teacher/class",
  students: "/teacher/students",
  student: (id: string, sessionId?: string) =>
    sessionId
      ? `/teacher/students/${id}?session=${encodeURIComponent(sessionId)}`
      : `/teacher/students/${id}`,
  schedule: "/teacher/schedule",
  profile: "/teacher/profile",
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
  exams: "/admin/exams",
  examNew: "/admin/exams/new",
  exam: (id: string) => `/admin/exams/${id}`,
} as const;

export function isNavActive(pathname: string, href: string): boolean {
  if (href === routes.dashboard) return pathname === routes.dashboard;
  if (href === routes.path) {
    return pathname === routes.path || pathname.startsWith(`${routes.path}/`);
  }
  if (href === routes.sessions) {
    return pathname === routes.sessions || pathname.includes("/sessions");
  }
  if (href === routes.certificates) {
    return pathname === routes.certificates || pathname.includes("/certificate");
  }
  if (href === routes.exams) {
    return pathname === routes.exams || pathname.startsWith(`${routes.exams}/`);
  }
  if (href === routes.courses) {
    return pathname === routes.courses;
  }
  if (href === adminRoutes.root) {
    return pathname === adminRoutes.root;
  }
  if (href === teacherRoutes.root) return pathname === teacherRoutes.root;
  if (href === teacherRoutes.students) {
    return (
      pathname === teacherRoutes.students ||
      pathname.startsWith(`${teacherRoutes.students}/`)
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
