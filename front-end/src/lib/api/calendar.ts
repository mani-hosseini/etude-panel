import { adminHttp } from "@/lib/api/admin-tokens";
import { studentHttp } from "@/lib/api/student-tokens";
import type {
  CalendarAudience,
  CalendarMonth,
  CalendarNow,
} from "@/lib/calendar/types";

function http(audience: CalendarAudience) {
  return audience === "admin" ? adminHttp : studentHttp;
}

export const calendarApi = {
  now: (audience: CalendarAudience) =>
    http(audience).requestData<CalendarNow>("/calendar/now"),

  month: (audience: CalendarAudience, year: number, month: number) =>
    http(audience).requestData<CalendarMonth>(
      `/calendar/month?year=${year}&month=${month}`,
    ),

  occasions: (year: number) =>
    adminHttp.requestData<{
      year: number;
      coverage: "unknown" | "holidays" | "complete";
      source: string | null;
      occasions: Array<{
        id: string;
        year: number;
        month: number;
        day: number;
        title: string;
        kind: string;
        isOfficialHoliday: boolean;
        source: string;
      }>;
    }>(`/admin/calendar/occasions?year=${year}`),

  createOccasion: (body: {
    year: number;
    month: number;
    day: number;
    title: string;
    kind: "NATIONAL" | "RELIGIOUS" | "OFFICIAL";
    isOfficialHoliday: boolean;
    source?: string;
  }) =>
    adminHttp.requestData("/admin/calendar/occasions", {
      method: "POST",
      body,
    }),

  deleteOccasion: (id: string) =>
    adminHttp.requestData<{ deleted: boolean }>(
      `/admin/calendar/occasions/${id}`,
      { method: "DELETE" },
    ),
};
