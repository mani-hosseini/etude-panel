"use client";

import { useQuery } from "@tanstack/react-query";

import { studioApi } from "@/lib/api/studio";

export const studioKeys = {
  overview: ["studio", "overview"] as const,
  profile: ["studio", "profile"] as const,
  students: ["studio", "students"] as const,
  student: (id: string) => ["studio", "student", id] as const,
  assignments: ["studio", "assignments"] as const,
  schedule: ["studio", "schedule"] as const,
  meetings: ["studio", "meetings"] as const,
  today: ["studio", "today"] as const,
};

export function useStudioOverviewQuery() {
  return useQuery({
    queryKey: studioKeys.overview,
    queryFn: () => studioApi.overview(),
  });
}

export function useStudioProfileQuery() {
  return useQuery({
    queryKey: studioKeys.profile,
    queryFn: () => studioApi.profile(),
  });
}

export function useStudioStudentsQuery() {
  return useQuery({
    queryKey: studioKeys.students,
    queryFn: () => studioApi.students(),
  });
}

export function useStudioStudentQuery(id: string) {
  return useQuery({
    queryKey: studioKeys.student(id),
    queryFn: () => studioApi.student(id),
    enabled: Boolean(id),
  });
}

export function useStudioAssignmentsQuery() {
  return useQuery({
    queryKey: studioKeys.assignments,
    queryFn: () => studioApi.assignments(),
  });
}

export function useStudioScheduleQuery() {
  return useQuery({
    queryKey: studioKeys.schedule,
    queryFn: () => studioApi.schedule(),
  });
}

export function useStudioMeetingsQuery() {
  return useQuery({
    queryKey: studioKeys.meetings,
    queryFn: () => studioApi.meetings(),
  });
}

export function useStudioTodayQuery() {
  return useQuery({
    queryKey: studioKeys.today,
    queryFn: () => studioApi.today(),
  });
}

