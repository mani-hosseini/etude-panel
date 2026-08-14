"use client";

import { useQuery } from "@tanstack/react-query";

import { audienceError } from "@/lib/api/errors";
import { api } from "@/lib/api/client";

export const queryKeys = {
  dashboard: ["dashboard"] as const,
  courses: ["courses"] as const,
  course: (courseId: string) => ["course", courseId] as const,
  sessions: (courseId?: string) => ["sessions", courseId ?? "primary"] as const,
  session: (sessionId: string, courseId?: string) =>
    ["session", courseId ?? "primary", sessionId] as const,
  sessionSlides: (sessionId: string, courseId?: string) =>
    ["session-slides", courseId ?? "primary", sessionId] as const,
  sessionAttachments: (sessionId: string, courseId?: string) =>
    ["session-attachments", courseId ?? "primary", sessionId] as const,
  schedule: (courseId?: string) =>
    ["schedule", courseId ?? "primary"] as const,
  profile: ["profile"] as const,
};

function queryErrorMessage(error: unknown) {
  return audienceError(error);
}

export function useDashboardQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => api.dashboard(),
  });
}

export function useCoursesQuery() {
  return useQuery({
    queryKey: queryKeys.courses,
    queryFn: () => api.courses(),
  });
}

export function useCourseQuery(courseId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.course(courseId ?? ""),
    queryFn: () => api.course(courseId!),
    enabled: Boolean(courseId) && enabled,
  });
}

export function useSessionsQuery(courseId?: string) {
  return useQuery({
    queryKey: queryKeys.sessions(courseId),
    queryFn: () => api.sessions(courseId),
  });
}

export function useSessionQuery(sessionId: string, courseId?: string) {
  return useQuery({
    queryKey: queryKeys.session(sessionId, courseId),
    queryFn: () => api.session(sessionId, courseId),
  });
}

export function useSessionSlidesQuery(
  sessionId: string,
  courseId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.sessionSlides(sessionId, courseId),
    queryFn: () => api.sessionSlides(sessionId, courseId),
    enabled,
  });
}

export function useSessionAttachmentsQuery(
  sessionId: string,
  courseId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.sessionAttachments(sessionId, courseId),
    queryFn: () => api.sessionAttachments(sessionId, courseId),
    enabled,
  });
}

export function useScheduleQuery(courseId?: string) {
  return useQuery({
    queryKey: queryKeys.schedule(courseId),
    queryFn: () => api.schedule(courseId),
  });
}

export function useProfileQuery() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => api.profile(),
  });
}

export { queryErrorMessage };
