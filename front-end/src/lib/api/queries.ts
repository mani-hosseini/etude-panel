"use client";

import { useQuery } from "@tanstack/react-query";

import { audienceError } from "@/lib/api/errors";
import { api } from "@/lib/api/client";
import { decodeCourseParam } from "@/lib/slug";

function courseKey(courseId?: string) {
  return decodeCourseParam(courseId) ?? courseId;
}

export const queryKeys = {
  dashboard: ["dashboard"] as const,
  courses: ["courses"] as const,
  course: (courseId: string) => ["course", courseId] as const,
  sessions: (courseId?: string, term?: number) =>
    ["sessions", courseId ?? "primary", term ?? "current"] as const,
  session: (sessionId: string, courseId?: string, term?: number) =>
    ["session", courseId ?? "primary", sessionId, term ?? "current"] as const,
  sessionSlides: (sessionId: string, courseId?: string, term?: number) =>
    [
      "session-slides",
      courseId ?? "primary",
      sessionId,
      term ?? "current",
    ] as const,
  sessionAttachments: (sessionId: string, courseId?: string, term?: number) =>
    [
      "session-attachments",
      courseId ?? "primary",
      sessionId,
      term ?? "current",
    ] as const,
  sessionExercises: (sessionId: string, courseId?: string, term?: number) =>
    [
      "session-exercises",
      courseId ?? "primary",
      sessionId,
      term ?? "current",
    ] as const,
  schedule: (courseId?: string) =>
    ["schedule", courseId ?? "primary"] as const,
  profile: ["profile"] as const,
  exams: ["exams"] as const,
  exam: (id: string) => ["exam", id] as const,
  assignments: ["assignments"] as const,
  practiceSeries: (range: string) => ["practice-series", range] as const,
  path: ["path"] as const,
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
  const id = courseKey(courseId);
  return useQuery({
    queryKey: queryKeys.course(id ?? ""),
    queryFn: () => api.course(id!),
    enabled: Boolean(id) && enabled,
  });
}

export function useSessionsQuery(courseId?: string, term?: number) {
  const id = courseKey(courseId);
  return useQuery({
    queryKey: queryKeys.sessions(id, term),
    queryFn: () => api.sessions(id, term),
  });
}

export function useSessionQuery(
  sessionId: string,
  courseId?: string,
  term?: number,
) {
  const id = courseKey(courseId);
  return useQuery({
    queryKey: queryKeys.session(sessionId, id, term),
    queryFn: () => api.session(sessionId, id, term),
  });
}

export function useSessionSlidesQuery(
  sessionId: string,
  courseId?: string,
  enabled = true,
  term?: number,
) {
  const id = courseKey(courseId);
  return useQuery({
    queryKey: queryKeys.sessionSlides(sessionId, id, term),
    queryFn: () => api.sessionSlides(sessionId, id, term),
    enabled,
  });
}

export function useSessionAttachmentsQuery(
  sessionId: string,
  courseId?: string,
  enabled = true,
  term?: number,
) {
  const id = courseKey(courseId);
  return useQuery({
    queryKey: queryKeys.sessionAttachments(sessionId, id, term),
    queryFn: () => api.sessionAttachments(sessionId, id, term),
    enabled,
  });
}

export function useSessionExercisesQuery(
  sessionId: string,
  courseId?: string,
  enabled = true,
  term?: number,
) {
  const id = courseKey(courseId);
  return useQuery({
    queryKey: queryKeys.sessionExercises(sessionId, id, term),
    queryFn: () => api.sessionExercises(sessionId, id, term),
    enabled,
  });
}

export function useScheduleQuery(courseId?: string) {
  const id = courseKey(courseId);
  return useQuery({
    queryKey: queryKeys.schedule(id),
    queryFn: () => api.schedule(id),
  });
}

export function useProfileQuery() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => api.profile(),
  });
}

export function useExamsQuery() {
  return useQuery({
    queryKey: queryKeys.exams,
    queryFn: () => api.exams(),
  });
}

export function useExamQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.exam(id),
    queryFn: () => api.exam(id),
    enabled: Boolean(id),
  });
}

export function useAssignmentsQuery() {
  return useQuery({
    queryKey: queryKeys.assignments,
    queryFn: () => api.assignments(),
  });
}

export function usePracticeSeriesQuery(range: "7d" | "30d" | "90d") {
  return useQuery({
    queryKey: queryKeys.practiceSeries(range),
    queryFn: () => api.practiceSeries(range),
  });
}

export function usePathProgressQuery() {
  return useQuery({
    queryKey: queryKeys.path,
    queryFn: () => api.pathProgress(),
  });
}

export { queryErrorMessage };
