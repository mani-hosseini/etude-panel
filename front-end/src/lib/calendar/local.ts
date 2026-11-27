import {
  JALALI_MONTHS,
  isLeapJalaliYear,
  jalaliMonthLength,
  toGregorian,
  toJalali,
} from "@/lib/jalali";
import { tehranPartsFromEpoch } from "@/lib/calendar/clock";
import type { CalendarDay, CalendarMonth, CalendarNow } from "@/lib/calendar/types";

const WEEKDAYS = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
] as const;

const WEEKDAY_INDEX: Record<string, number> = {
  Sat: 0,
  Sun: 1,
  Mon: 2,
  Tue: 3,
  Wed: 4,
  Thu: 5,
  Fri: 6,
};

const HOLIDAYS_1405: Array<{
  month: number;
  day: number;
  title: string;
  kind: string;
}> = [
  { month: 1, day: 1, title: "عید سعید فطر و آغاز نوروز", kind: "religious" },
  { month: 1, day: 2, title: "تعطیل به مناسبت عید فطر و نوروز", kind: "official" },
  { month: 1, day: 3, title: "عید نوروز", kind: "national" },
  { month: 1, day: 4, title: "عید نوروز", kind: "national" },
  { month: 1, day: 12, title: "روز جمهوری اسلامی ایران", kind: "national" },
  { month: 1, day: 13, title: "روز طبیعت", kind: "national" },
  { month: 1, day: 25, title: "شهادت حضرت امام جعفر صادق علیه‌السلام", kind: "religious" },
  { month: 3, day: 6, title: "عید سعید قربان", kind: "religious" },
  { month: 3, day: 14, title: "عید سعید غدیر خم و رحلت حضرت امام خمینی", kind: "religious" },
  { month: 3, day: 15, title: "قیام ۱۵ خرداد", kind: "national" },
  { month: 4, day: 3, title: "تاسوعای حسینی", kind: "religious" },
  { month: 4, day: 4, title: "عاشورای حسینی", kind: "religious" },
  { month: 5, day: 13, title: "اربعین حسینی", kind: "religious" },
  { month: 5, day: 21, title: "رحلت حضرت رسول اکرم و شهادت امام حسن مجتبی", kind: "religious" },
  { month: 5, day: 22, title: "شهادت حضرت امام رضا علیه‌السلام", kind: "religious" },
  { month: 5, day: 30, title: "شهادت امام حسن عسکری و آغاز امامت حضرت ولی‌عصر", kind: "religious" },
  { month: 6, day: 8, title: "ولادت حضرت رسول اکرم و امام جعفر صادق", kind: "religious" },
  { month: 8, day: 22, title: "شهادت حضرت فاطمه زهرا", kind: "religious" },
  { month: 10, day: 2, title: "ولادت حضرت امام علی علیه‌السلام", kind: "religious" },
  { month: 10, day: 16, title: "مبعث حضرت رسول اکرم", kind: "religious" },
  { month: 11, day: 4, title: "ولادت حضرت قائم", kind: "religious" },
  { month: 11, day: 22, title: "پیروزی انقلاب اسلامی ایران", kind: "national" },
  { month: 12, day: 9, title: "شهادت حضرت امام علی علیه‌السلام", kind: "religious" },
  { month: 12, day: 19, title: "عید سعید فطر", kind: "religious" },
  { month: 12, day: 20, title: "تعطیل به مناسبت عید سعید فطر", kind: "official" },
  { month: 12, day: 29, title: "روز ملی شدن صنعت نفت ایران", kind: "national" },
];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function weekdayIndex(iso: string) {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    weekday: "short",
  }).format(new Date(`${iso}T12:00:00+03:30`));
  return WEEKDAY_INDEX[name] ?? 0;
}

function describeDay(year: number, month: number, day: number): CalendarDay {
  const gregorian = toGregorian(year, month, day);
  const text = `${gregorian.gy}-${pad(gregorian.gm)}-${pad(gregorian.gd)}`;
  const weekday = weekdayIndex(text);
  const known = year === 1405;
  const occasions = known
    ? HOLIDAYS_1405.filter((item) => item.month === month && item.day === day).map(
        (item) => ({
          title: item.title,
          kind: item.kind,
          isOfficialHoliday: true,
          source: "تقویم رسمی سال ۱۴۰۵",
        }),
      )
    : [];
  const officialHoliday = occasions.some((item) => item.isOfficialHoliday);
  const isFriday = weekday === 6;
  return {
    gregorian: {
      year: gregorian.gy,
      month: gregorian.gm,
      day: gregorian.gd,
      text,
    },
    jalali: {
      year,
      month,
      day,
      monthName: JALALI_MONTHS[month - 1] ?? "",
      text: `${year}/${pad(month)}/${pad(day)}`,
    },
    weekday,
    weekdayName: WEEKDAYS[weekday] ?? "",
    isFriday,
    isWeeklyHoliday: isFriday,
    officialHoliday,
    isHoliday: isFriday || officialHoliday,
    occasionsStatus: known ? "official" : "unknown",
    coverage: known ? "holidays" : "unknown",
    occasions,
  };
}

export function buildLocalMonth(year: number, month: number): CalendarMonth {
  const length = jalaliMonthLength(year, month);
  const days = Array.from({ length }, (_, index) =>
    describeDay(year, month, index + 1),
  );
  return {
    timezone: "Asia/Tehran",
    year,
    month,
    monthName: JALALI_MONTHS[month - 1] ?? "",
    length,
    leapYear: isLeapJalaliYear(year),
    startsOn: days[0]?.weekday ?? 0,
    weekdays: [...WEEKDAYS],
    days,
  };
}

export function buildLocalNow(epochMs: number): CalendarNow {
  const parts = tehranPartsFromEpoch(epochMs);
  const [year, month, day] = parts.date.split("-").map(Number);
  const jalali = toJalali(year!, month!, day!);
  return {
    ...describeDay(jalali.jy, jalali.jm, jalali.jd),
    timezone: "Asia/Tehran",
    epochMs,
    time: parts.time,
  };
}
