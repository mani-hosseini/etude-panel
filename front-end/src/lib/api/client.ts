import { ApiError } from "@/lib/api/http";
import { studentHttp } from "@/lib/api/student-tokens";
import type {
  DashboardPayload,
  ProfilePayload,
  SchedulePayload,
  SessionsPayload,
  CourseSession,
  CourseCard,
  ApiSlide,
} from "@/lib/api/types";

export { ApiError };
export {
  getStoredAccessToken,
  getStoredRefreshToken,
  setTokens,
  clearTokens,
} from "@/lib/api/student-tokens";

/** Student-facing API (uses student token store). */
export const api = {
  login: (body: {
    firstName: string;
    lastName: string;
    password: string;
  }) =>
    studentHttp.requestData<{
      accessToken: string;
      refreshToken: string;
      session: {
        firstName: string;
        lastName: string;
        displayName: string;
        loggedInAt: string;
        studentCode: string | null;
      };
    }>("/auth/login", { method: "POST", body, auth: false }),

  logout: (refreshToken: string) =>
    studentHttp.requestData<{ loggedOut: boolean }>("/auth/logout", {
      method: "POST",
      body: { refreshToken },
    }),

  register: (body: {
    firstName: string;
    lastName: string;
    password: string;
    confirmPassword: string;
  }) =>
    studentHttp.requestData<{
      accessToken: string;
      refreshToken: string;
      session: {
        firstName: string;
        lastName: string;
        displayName: string;
        loggedInAt: string;
        studentCode: string | null;
      };
    }>("/auth/register", { method: "POST", body, auth: false }),

  me: () =>
    studentHttp.requestData<{
      id: string;
      displayName: string;
      session: {
        firstName: string;
        lastName: string;
        displayName: string;
        loggedInAt: string;
        studentCode: string | null;
      };
    }>("/auth/me"),

  dashboard: () => studentHttp.requestData<DashboardPayload>("/dashboard"),
  courses: () =>
    studentHttp.requestData<{ courses: CourseCard[] }>("/courses"),
  course: (id: string) => studentHttp.requestData<CourseCard>(`/courses/${id}`),
  sessions: (courseId?: string) =>
    studentHttp.requestData<SessionsPayload>(
      courseId
        ? `/sessions?courseId=${encodeURIComponent(courseId)}`
        : "/sessions",
    ),
  session: (id: string, courseId?: string) =>
    studentHttp.requestData<CourseSession>(
      courseId
        ? `/sessions/${id}?courseId=${encodeURIComponent(courseId)}`
        : `/sessions/${id}`,
    ),
  sessionSlides: (id: string, courseId?: string) =>
    studentHttp.requestData<{
      sessionId: string;
      total: number;
      courseTitle?: string;
      progress?: {
        lastSlideIndex: number;
        viewProgress: number;
        viewed: boolean;
        completedAt: string | null;
      };
      slides: ApiSlide[];
    }>(
      courseId
        ? `/sessions/${id}/slides?courseId=${encodeURIComponent(courseId)}`
        : `/sessions/${id}/slides`,
    ),

  updateSessionProgress: (
    id: string,
    lastSlideIndex: number,
    courseId?: string,
  ) =>
    studentHttp.requestData<{
      lastSlideIndex: number;
      viewProgress: number;
      viewed: boolean;
      completedAt: string | null;
    }>(
      courseId
        ? `/sessions/${id}/progress?courseId=${encodeURIComponent(courseId)}`
        : `/sessions/${id}/progress`,
      {
        method: "PUT",
        body: { lastSlideIndex },
      },
    ),

  schedule: (courseId?: string) =>
    studentHttp.requestData<SchedulePayload>(
      courseId
        ? `/schedule?courseId=${encodeURIComponent(courseId)}`
        : "/schedule",
    ),
  profile: () => studentHttp.requestData<ProfilePayload>("/profile"),

  updateProfile: (body: {
    firstName?: string;
    lastName?: string;
    level?: string;
    phone?: string;
    nationalId?: string;
    address?: string;
    password?: string;
    confirmPassword?: string;
  }) =>
    studentHttp.requestData<{
      id: string;
      firstName: string;
      lastName: string;
      displayName: string;
      level: string | null;
      studentCode: string | null;
      avatarUrl: string | null;
      phone: string | null;
      nationalId: string | null;
      address: string | null;
    }>("/profile", { method: "PATCH", body }),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return studentHttp.upload<{
      path: string;
      avatarUrl: string;
      filename: string;
      mimeType: string;
      size: number;
    }>("/profile/avatar", formData);
  },

  deleteAvatar: () =>
    studentHttp.requestData<{ deleted: boolean; avatarUrl: null }>(
      "/profile/avatar",
      { method: "DELETE" },
    ),
};
