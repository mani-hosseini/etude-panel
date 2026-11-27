export type CalendarOccasion = {
  title: string;
  kind: string;
  isOfficialHoliday: boolean;
  source: string;
};

export type CalendarDay = {
  gregorian: { year: number; month: number; day: number; text: string };
  jalali: {
    year: number;
    month: number;
    day: number;
    monthName: string;
    text: string;
  };
  weekday: number;
  weekdayName: string;
  isFriday: boolean;
  isWeeklyHoliday: boolean;
  officialHoliday: boolean;
  isHoliday: boolean;
  occasionsStatus: "unknown" | "official";
  coverage: "unknown" | "holidays" | "complete";
  occasions: CalendarOccasion[];
};

export type CalendarNow = CalendarDay & {
  timezone: string;
  epochMs: number;
  time: string;
};

export type CalendarMonth = {
  timezone: string;
  year: number;
  month: number;
  monthName: string;
  length: number;
  leapYear: boolean;
  startsOn: number;
  weekdays: string[];
  days: CalendarDay[];
};

export type CalendarAudience = "panel" | "admin";
