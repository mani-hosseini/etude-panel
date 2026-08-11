"use client";

import { useQuery } from "@tanstack/react-query";

import {
  adminApi,
  type ListCoursesParams,
  type ListUsersParams,
} from "@/lib/api/admin-client";

export const adminQueryKeys = {
  stats: ["admin", "users-stats"] as const,
  users: (params: ListUsersParams) => ["admin", "users", params] as const,
  user: (id: string) => ["admin", "user", id] as const,
  courses: (params: ListCoursesParams) =>
    ["admin", "courses", params] as const,
  course: (id: string) => ["admin", "course", id] as const,
  sessions: (courseId: string) => ["admin", "sessions", courseId] as const,
  slides: (sessionId: string) => ["admin", "slides", sessionId] as const,
  schedule: (courseId: string) => ["admin", "schedule", courseId] as const,
  tips: (courseId: string) => ["admin", "tips", courseId] as const,
};

export function useAdminUsersStatsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.stats,
    queryFn: () => adminApi.usersStats(),
  });
}

export function useAdminUsersQuery(params: ListUsersParams) {
  return useQuery({
    queryKey: adminQueryKeys.users(params),
    queryFn: () => adminApi.users(params),
  });
}

export function useAdminUserQuery(id: string) {
  return useQuery({
    queryKey: adminQueryKeys.user(id),
    queryFn: () => adminApi.user(id),
    enabled: Boolean(id),
  });
}

export function useAdminCoursesQuery(params: ListCoursesParams = {}) {
  return useQuery({
    queryKey: adminQueryKeys.courses(params),
    queryFn: () => adminApi.courses(params),
  });
}

export function useAdminCourseQuery(id: string) {
  return useQuery({
    queryKey: adminQueryKeys.course(id),
    queryFn: () => adminApi.course(id),
    enabled: Boolean(id),
  });
}

export function useAdminSlidesQuery(sessionId: string) {
  return useQuery({
    queryKey: adminQueryKeys.slides(sessionId),
    queryFn: () => adminApi.slides(sessionId),
    enabled: Boolean(sessionId),
  });
}

export function useAdminScheduleQuery(courseId: string) {
  return useQuery({
    queryKey: adminQueryKeys.schedule(courseId),
    queryFn: () => adminApi.schedule(courseId),
    enabled: Boolean(courseId),
  });
}

export function useAdminTipsQuery(courseId: string) {
  return useQuery({
    queryKey: adminQueryKeys.tips(courseId),
    queryFn: () => adminApi.tips(courseId),
    enabled: Boolean(courseId),
  });
}
