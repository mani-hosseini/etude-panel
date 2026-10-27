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
  SessionAttachment,
  StudentExam,
  ExamSubmissionSummary,
  StudentAssignment,
  PracticeSeries,
  PathProgress,
} from "@/lib/api/types";
import { decodeCourseParam } from "@/lib/slug";

export { ApiError };

function courseSlug(courseId?: string | null): string | undefined {
  return decodeCourseParam(courseId) ?? (courseId?.trim() || undefined);
}

async function requestWithCourseFallback<T>(
  courseId: string | undefined,
  makePath: (id: string | undefined) => string,
): Promise<T> {
  const id = courseSlug(courseId);
  try {
    return await studentHttp.requestData<T>(makePath(id));
  } catch (error) {
    if (id && error instanceof ApiError && error.status === 404) {
      return studentHttp.requestData<T>(makePath(undefined));
    }
    throw error;
  }
}
export {
  getStoredAccessToken,
  getStoredRefreshToken,
  setTokens,
  clearTokens,
} from "@/lib/api/student-tokens";

/** Student-facing API (uses student token store). */
export const api = {
  login: (
    body:
      | { username: string; password: string }
      | { firstName: string; lastName: string; password: string },
  ) =>
    studentHttp.requestData<{
      accessToken: string;
      refreshToken: string;
      session: {
        firstName: string;
        lastName: string;
        displayName: string;
        loggedInAt: string;
        studentCode: string | null;
        role?: "STUDENT" | "TEACHER" | "ADMIN";
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
  course: (id: string) => {
    const slug = courseSlug(id) ?? id;
    return studentHttp.requestData<CourseCard>(
      `/courses/${encodeURIComponent(slug)}`,
    );
  },
  sessions: (courseId?: string) =>
    requestWithCourseFallback<SessionsPayload>(courseId, (id) => {
      const params = new URLSearchParams({ limit: "100" });
      if (id) params.set("courseId", id);
      return `/sessions?${params}`;
    }),
  session: (id: string, courseId?: string) =>
    requestWithCourseFallback<CourseSession>(courseId, (slug) =>
      slug
        ? `/sessions/${id}?courseId=${encodeURIComponent(slug)}`
        : `/sessions/${id}`,
    ),
  sessionSlides: (id: string, courseId?: string) =>
    requestWithCourseFallback<{
      sessionId: string;
      total: number;
      slides: ApiSlide[];
      courseTitle?: string;
    }>(courseId, (slug) =>
      slug
        ? `/sessions/${id}/slides?courseId=${encodeURIComponent(slug)}`
        : `/sessions/${id}/slides`,
    ),
  sessionAttachments: (id: string, courseId?: string) =>
    requestWithCourseFallback<{
      sessionId: string;
      total: number;
      attachments: SessionAttachment[];
      courseTitle?: string;
    }>(courseId, (slug) =>
      slug
        ? `/sessions/${id}/attachments?courseId=${encodeURIComponent(slug)}`
        : `/sessions/${id}/attachments`,
    ),
  schedule: (courseId?: string) =>
    requestWithCourseFallback<SchedulePayload>(courseId, (slug) =>
      slug ? `/schedule?courseId=${encodeURIComponent(slug)}` : "/schedule",
    ),
  profile: () => studentHttp.requestData<ProfilePayload>("/profile"),

  updateProfile: (body: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    nationalId?: string;
    address?: string;
    password?: string;
  }) =>
    studentHttp.requestData<ProfilePayload>("/profile", {
      method: "PATCH",
      body,
    }),

  sessionProgress: (id: string, courseId?: string) =>
    requestWithCourseFallback<{
      sessionId: string;
      lastSlideIndex: number;
      slideCount: number;
      progressPercent: number;
      completedAt: string | null;
    }>(courseId, (slug) =>
      slug
        ? `/sessions/${id}/progress?courseId=${encodeURIComponent(slug)}`
        : `/sessions/${id}/progress`,
    ),

  updateSessionProgress: (
    id: string,
    lastSlideIndex: number,
    courseId?: string,
  ) => {
    const slug = courseSlug(courseId);
    return studentHttp.requestData<{
      sessionId: string;
      lastSlideIndex: number;
      slideCount: number;
      progressPercent: number;
      completedAt: string | null;
    }>(
      slug
        ? `/sessions/${id}/progress?courseId=${encodeURIComponent(slug)}`
        : `/sessions/${id}/progress`,
      { method: "PATCH", body: { lastSlideIndex } },
    );
  },

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

  exams: () => studentHttp.requestData<{ exams: StudentExam[] }>("/exams"),

  exam: (id: string) => studentHttp.requestData<StudentExam>(`/exams/${id}`),

  submitExamPdf: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return studentHttp.upload<{
      submitted: boolean;
      submission: ExamSubmissionSummary;
    }>(`/exams/${id}/submission`, formData);
  },

  downloadOwnExamPdf: (id: string) =>
    studentHttp.download(`/exams/${id}/submission/file`),

  downloadExamPaper: (id: string) =>
    studentHttp.download(`/exams/${id}/file`),

  downloadExamAnswerKey: (id: string) =>
    studentHttp.download(`/exams/${id}/answer-file`),

  assignments: () =>
    studentHttp.requestData<StudentAssignment[]>("/assignments"),

  updateAssignmentProgress: (id: string, progress: number) =>
    studentHttp.requestData<{ id: string; progress: number }>(
      `/assignments/${id}/progress`,
      { method: "PATCH", body: { progress } },
    ),

  practiceSeries: (range: "7d" | "30d" | "90d" = "7d") =>
    studentHttp.requestData<PracticeSeries>(
      `/practice/series?range=${range}`,
    ),

  logPractice: (minutes: number) =>
    studentHttp.requestData<{ date: string; minutes: number }>(
      "/practice/log",
      { method: "POST", body: { minutes } },
    ),

  pathProgress: () => studentHttp.requestData<PathProgress>("/path"),

  downloadCertificate: (courseId: string) =>
    studentHttp.download(
      `/courses/${encodeURIComponent(courseSlug(courseId) ?? courseId)}/certificate/download`,
    ),
};
