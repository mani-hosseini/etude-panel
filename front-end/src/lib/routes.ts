/** Clean dashboard paths — courseId is the public slug (e.g. theory-basics). */

export type SessionPlayViewKind = "slides" | "attachments" | "exercises";

function withSearch(
  path: string,
  params: Record<string, string | number | undefined>,
) {
  const [base, existing] = path.split("?");
  const search = new URLSearchParams(existing);
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${base}?${query}` : base;
}

function withSessionView(
  path: string,
  view?: SessionPlayViewKind,
  term?: number,
) {
  return withSearch(path, {
    view:
      view === "attachments" || view === "exercises" ? view : undefined,
    term: term && term >= 1 ? term : undefined,
  });
}

export const routes = {
  dashboard: "/dashboard",
  path: "/dashboard/path",
  courses: "/dashboard/courses",
  course: (courseId: string) => `/dashboard/courses/${courseId}`,
  courseSessions: (
    courseId: string,
    opts?: { list?: boolean; term?: number },
  ) =>
    withSearch(`/dashboard/courses/${courseId}/sessions`, {
      list: opts?.list ? "1" : undefined,
      term: opts?.term,
    }),
  courseSession: (
    courseId: string,
    sessionId: string,
    view?: SessionPlayViewKind,
    term?: number,
  ) =>
    withSessionView(
      `/dashboard/courses/${courseId}/sessions/${sessionId}`,
      view,
      term,
    ),
  courseSessionPlay: (
    courseId: string,
    sessionId: string,
    view?: SessionPlayViewKind,
    term?: number,
  ) =>
    withSessionView(
      `/dashboard/courses/${courseId}/sessions/${sessionId}/play`,
      view,
      term,
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
