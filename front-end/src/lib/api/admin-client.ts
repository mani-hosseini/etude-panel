import type { PaginationMeta } from "@/lib/api/http";
import { adminHttp } from "@/lib/api/admin-tokens";

export type AdminUserEnrollment = {
  id: string;
  joinedAt: string;
  progress?: number;
  sessionsDone?: number;
  sessionsTotal?: number;
  course: {
    id: string;
    uuid: string;
    title: string;
    teacher: string;
    status: string;
    instrument: string;
  };
};

export type AdminUserDetail = AdminUser & {
  enrollments: AdminUserEnrollment[];
  achievements: {
    id: string;
    title: string;
    desc: string;
    earnedAt: string;
  }[];
};

export type CreateStudentBody = {
  firstName: string;
  lastName: string;
  password: string;
  studentCode?: string;
};

export type AdminRole = "STUDENT" | "ADMIN";

export type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string | null;
  role: AdminRole;
  studentCode: string | null;
  level: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  nationalId?: string | null;
  address?: string | null;
  password?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  enrollmentsCount: number;
  achievementsCount: number;
  avgProgress?: number;
};

export type AdminUsersStats = {
  total: number;
  students: number;
  admins: number;
  active: number;
  inactive: number;
};

export type AdminPublicUser = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  studentCode: string | null;
  email: string | null;
  role: AdminRole;
  level: string | null;
};

export type ListUsersParams = {
  page?: number;
  limit?: number;
  role?: AdminRole;
  isActive?: boolean;
  search?: string;
  sort?: string;
};

export type CourseStatus = "ACTIVE" | "UPCOMING" | "COMPLETED";
export type SessionStatus = "AVAILABLE" | "UPCOMING" | "LOCKED";
export type SlideKind = "COVER" | "LESSON" | "VISUAL" | "OUTRO";
export type LessonType = "PRIVATE" | "GROUP" | "THEORY";
export type LessonStatus = "DONE" | "NEXT" | "PLANNED";

export type AdminCourse = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  instrument: string;
  teacher: string;
  teacherShort: string;
  day: string;
  time: string;
  timeShort: string;
  duration: string;
  room: string;
  level: string;
  focus: string;
  sessionsTotal: number;
  weeklyHours: number;
  status: CourseStatus;
  certificateReady: boolean;
  accessNote: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  sessionsCount: number;
  enrollmentsCount: number;
  scheduleCount: number;
};

export type AdminSession = {
  id: string;
  courseId: string;
  number: number;
  title: string;
  summary: string;
  topics: string[];
  status: SessionStatus;
  durationLabel: string;
  dateLabel: string;
  slideCount: number;
  attachmentCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminAttachment = {
  id: string;
  sessionId: string;
  path: string;
  filename: string;
  mimeType: string;
  size: number;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminSlideTerm = { en: string; fa: string };

export type AdminSlide = {
  id: string;
  sessionId: string;
  sourceId: string;
  sortOrder: number;
  chapter: string;
  title: string;
  goal: string;
  body: string;
  bullets: string[];
  terms: AdminSlideTerm[] | unknown;
  mistakes: string[];
  imageHint: string | null;
  imageId: string | null;
  funFact: string | null;
  kind: SlideKind;
  createdAt: string;
  updatedAt: string;
};

export type AdminScheduleLesson = {
  id: string;
  courseId: string;
  sessionId: string | null;
  title: string;
  teacher: string;
  day: string;
  dateLabel: string;
  time: string;
  room: string;
  type: LessonType;
  duration: string;
  note: string | null;
  status: LessonStatus;
  sortOrder: number;
};

export type AdminPracticeTip = {
  id: string;
  text: string;
  sortOrder: number;
};

export type AdminCourseDetail = AdminCourse & {
  sessions: AdminSession[];
};

export type UpsertCourseBody = {
  slug?: string;
  title: string;
  subtitle: string;
  instrument: string;
  teacher: string;
  teacherShort: string;
  day: string;
  time: string;
  timeShort: string;
  duration: string;
  room: string;
  level: string;
  focus: string;
  sessionsTotal: number;
  weeklyHours?: number;
  status?: CourseStatus;
  certificateReady?: boolean;
  accessNote?: string;
  isActive?: boolean;
  sortOrder?: number;
};

export type ListCoursesParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: CourseStatus;
  isActive?: boolean;
};

function qs(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const adminApi = {
  login: (body: { email: string; password: string }) =>
    adminHttp.requestData<{
      accessToken: string;
      refreshToken: string;
      tokenType: string;
      expiresIn: string;
      user: AdminPublicUser;
    }>("/auth/admin/login", { method: "POST", body, auth: false }),

  logout: (refreshToken: string) =>
    adminHttp.requestData<{ loggedOut: boolean }>("/auth/logout", {
      method: "POST",
      body: { refreshToken },
    }),

  me: () =>
    adminHttp.requestData<{
      id: string;
      displayName: string;
      role?: AdminRole;
      user?: AdminPublicUser;
      session?: {
        firstName: string;
        lastName: string;
        displayName: string;
      };
    }>("/auth/me"),

  usersStats: () => adminHttp.requestData<AdminUsersStats>("/users/stats"),

  users: async (params: ListUsersParams = {}) => {
    const query = qs({
      page: params.page,
      limit: params.limit,
      role: params.role,
      isActive: params.isActive,
      search: params.search,
      sort: params.sort,
    });
    const { data, meta } = await adminHttp.request<{ users: AdminUser[] }>(
      `/users${query}`,
    );
    return {
      users: data.users,
      meta: meta as PaginationMeta | undefined,
    };
  },

  activateUser: (id: string) =>
    adminHttp.requestData<AdminUser>(`/users/${id}/activate`, {
      method: "POST",
    }),

  deactivateUser: (id: string) =>
    adminHttp.requestData<AdminUser>(`/users/${id}/deactivate`, {
      method: "POST",
    }),

  user: (id: string) =>
    adminHttp.requestData<AdminUserDetail>(`/users/${id}`),

  updateUser: (
    id: string,
    body: {
      firstName?: string;
      lastName?: string;
      email?: string;
      level?: string;
      studentCode?: string;
      phone?: string;
      nationalId?: string;
      address?: string;
      isActive?: boolean;
      password?: string;
    },
  ) =>
    adminHttp.requestData<AdminUser>(`/users/${id}`, {
      method: "PATCH",
      body,
    }),

  resetPassword: (id: string, password: string) =>
    adminHttp.requestData<{ reset: boolean; password: string }>(
      `/users/${id}/reset-password`,
      { method: "POST", body: { password } },
    ),

  createStudent: (body: CreateStudentBody) =>
    adminHttp.requestData<AdminPublicUser>("/auth/register/student", {
      method: "POST",
      body,
    }),

  deleteUser: (id: string) =>
    adminHttp.requestData<{ deleted: boolean }>(`/users/${id}`, {
      method: "DELETE",
    }),

  enrollUser: (userId: string, courseId: string) =>
    adminHttp.requestData<{
      id: string;
      joinedAt: string;
      courseId: string;
      courseTitle: string;
    }>(`/users/${userId}/enrollments`, {
      method: "POST",
      body: { courseId },
    }),

  unenrollUser: (userId: string, courseId: string) =>
    adminHttp.requestData<{ removed: boolean }>(
      `/users/${userId}/enrollments/${encodeURIComponent(courseId)}`,
      { method: "DELETE" },
    ),

  courses: async (params: ListCoursesParams = {}) => {
    const query = qs({
      page: params.page,
      limit: params.limit,
      search: params.search,
      status: params.status,
      isActive: params.isActive,
    });
    const { data, meta } = await adminHttp.request<{ courses: AdminCourse[] }>(
      `/admin/courses${query}`,
    );
    return {
      courses: data.courses,
      meta: meta as PaginationMeta | undefined,
    };
  },

  course: (id: string) =>
    adminHttp.requestData<AdminCourseDetail>(`/admin/courses/${id}`),

  createCourse: (body: UpsertCourseBody) =>
    adminHttp.requestData<AdminCourseDetail>("/admin/courses", {
      method: "POST",
      body,
    }),

  updateCourse: (id: string, body: UpsertCourseBody) =>
    adminHttp.requestData<AdminCourseDetail>(`/admin/courses/${id}`, {
      method: "PATCH",
      body,
    }),

  deleteCourse: (id: string) =>
    adminHttp.requestData<{ deleted: boolean }>(`/admin/courses/${id}`, {
      method: "DELETE",
    }),

  sessions: (courseId: string) =>
    adminHttp.requestData<{ sessions: AdminSession[] }>(
      `/admin/courses/${courseId}/sessions`,
    ),

  createSession: (
    courseId: string,
    body: {
      number: number;
      title?: string;
      summary?: string;
      topics?: string[];
      status?: SessionStatus;
      durationLabel?: string;
      dateLabel?: string;
    },
  ) =>
    adminHttp.requestData<AdminSession>(
      `/admin/courses/${courseId}/sessions`,
      { method: "POST", body },
    ),

  updateSession: (
    id: string,
    body: Partial<{
      number: number;
      title: string;
      summary: string;
      topics: string[];
      status: SessionStatus;
      durationLabel: string;
      dateLabel: string;
    }>,
  ) =>
    adminHttp.requestData<AdminSession>(`/admin/sessions/${id}`, {
      method: "PATCH",
      body,
    }),

  deleteSession: (id: string) =>
    adminHttp.requestData<{ deleted: boolean }>(`/admin/sessions/${id}`, {
      method: "DELETE",
    }),

  slides: (sessionId: string) =>
    adminHttp.requestData<{ slides: AdminSlide[] }>(
      `/admin/sessions/${sessionId}/slides`,
    ),

  createSlide: (
    sessionId: string,
    body: {
      sourceId?: string;
      sortOrder?: number;
      chapter: string;
      title: string;
      goal?: string;
      body: string;
      bullets?: string[];
      terms?: AdminSlideTerm[];
      mistakes?: string[];
      imageHint?: string;
      imageId?: string;
      funFact?: string;
      kind?: SlideKind;
    },
  ) =>
    adminHttp.requestData<AdminSlide>(
      `/admin/sessions/${sessionId}/slides`,
      { method: "POST", body },
    ),

  updateSlide: (
    id: string,
    body: Partial<{
      sourceId: string;
      sortOrder: number;
      chapter: string;
      title: string;
      goal: string;
      body: string;
      bullets: string[];
      terms: AdminSlideTerm[];
      mistakes: string[];
      imageHint: string | null;
      imageId: string | null;
      funFact: string | null;
      kind: SlideKind;
    }>,
  ) =>
    adminHttp.requestData<AdminSlide>(`/admin/slides/${id}`, {
      method: "PATCH",
      body,
    }),

  deleteSlide: (id: string) =>
    adminHttp.requestData<{ deleted: boolean }>(`/admin/slides/${id}`, {
      method: "DELETE",
    }),

  reorderSlides: (sessionId: string, slideIds: string[]) =>
    adminHttp.requestData<{ slides: AdminSlide[] }>(
      `/admin/sessions/${sessionId}/slides/reorder`,
      { method: "POST", body: { slideIds } },
    ),

  attachments: (sessionId: string) =>
    adminHttp.requestData<{ attachments: AdminAttachment[] }>(
      `/admin/sessions/${sessionId}/attachments`,
    ),

  uploadAttachment: (sessionId: string, file: File, caption?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (caption?.trim()) formData.append("caption", caption.trim());
    return adminHttp.upload<AdminAttachment>(
      `/admin/sessions/${sessionId}/attachments`,
      formData,
    );
  },

  updateAttachment: (id: string, body: { caption?: string }) =>
    adminHttp.requestData<AdminAttachment>(`/admin/attachments/${id}`, {
      method: "PATCH",
      body,
    }),

  deleteAttachment: (id: string) =>
    adminHttp.requestData<{ deleted: boolean }>(`/admin/attachments/${id}`, {
      method: "DELETE",
    }),

  reorderAttachments: (sessionId: string, attachmentIds: string[]) =>
    adminHttp.requestData<{ attachments: AdminAttachment[] }>(
      `/admin/sessions/${sessionId}/attachments/reorder`,
      { method: "POST", body: { attachmentIds } },
    ),

  schedule: (courseId: string) =>
    adminHttp.requestData<{ lessons: AdminScheduleLesson[] }>(
      `/admin/courses/${courseId}/schedule`,
    ),

  createSchedule: (
    courseId: string,
    body: {
      sessionId?: string | null;
      title: string;
      teacher: string;
      day: string;
      dateLabel: string;
      time: string;
      room: string;
      type?: LessonType;
      duration: string;
      note?: string;
      status?: LessonStatus;
      sortOrder?: number;
    },
  ) =>
    adminHttp.requestData<AdminScheduleLesson>(
      `/admin/courses/${courseId}/schedule`,
      { method: "POST", body },
    ),

  updateSchedule: (
    id: string,
    body: {
      sessionId?: string | null;
      title: string;
      teacher: string;
      day: string;
      dateLabel: string;
      time: string;
      room: string;
      type?: LessonType;
      duration: string;
      note?: string;
      status?: LessonStatus;
      sortOrder?: number;
    },
  ) =>
    adminHttp.requestData<AdminScheduleLesson>(`/admin/schedule/${id}`, {
      method: "PATCH",
      body,
    }),

  deleteSchedule: (id: string) =>
    adminHttp.requestData<{ deleted: boolean }>(`/admin/schedule/${id}`, {
      method: "DELETE",
    }),

  tips: (courseId: string) =>
    adminHttp.requestData<{ tips: AdminPracticeTip[] }>(
      `/admin/courses/${courseId}/tips`,
    ),

  createTip: (courseId: string, body: { text: string; sortOrder?: number }) =>
    adminHttp.requestData<AdminPracticeTip>(
      `/admin/courses/${courseId}/tips`,
      { method: "POST", body },
    ),

  updateTip: (id: string, body: { text: string; sortOrder?: number }) =>
    adminHttp.requestData<AdminPracticeTip>(`/admin/tips/${id}`, {
      method: "PATCH",
      body,
    }),

  deleteTip: (id: string) =>
    adminHttp.requestData<{ deleted: boolean }>(`/admin/tips/${id}`, {
      method: "DELETE",
    }),

  uploadSlideImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return adminHttp.upload<{
      path: string;
      filename: string;
      mimeType: string;
      size: number;
    }>("/admin/uploads/slide-image", formData);
  },
};
