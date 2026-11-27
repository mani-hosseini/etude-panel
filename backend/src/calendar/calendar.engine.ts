import {
  isLeapJalaaliYear,
  isValidJalaaliDate,
  jalaaliMonthLength,
  toGregorian,
  toJalaali,
} from 'jalaali-js';

export const TEHRAN_TIME_ZONE = 'Asia/Tehran';

export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

/** Saturday-first, matching the Iranian week. */
export const JALALI_WEEKDAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
] as const;

const WEEKDAY_FROM_INTL: Record<string, number> = {
  Sat: 0,
  Sun: 1,
  Mon: 2,
  Tue: 3,
  Wed: 4,
  Thu: 5,
  Fri: 6,
};

export type CalendarCoverageName = 'unknown' | 'holidays' | 'complete';

export type StoredOccasion = {
  jalaliYear: number;
  jalaliMonth: number;
  jalaliDay: number;
  title: string;
  kind: 'NATIONAL' | 'RELIGIOUS' | 'OFFICIAL';
  isOfficialHoliday: boolean;
  source: string;
};

export type TehranParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Saturday … 6 = Friday */
  weekday: number;
};

/** Civil date and clock in Asia/Tehran. Independent of the host timezone. */
export function tehranDateTime(instant: Date): TehranParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TEHRAN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(instant);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  let hour = Number(pick('hour'));
  if (hour === 24) hour = 0;
  const weekday = WEEKDAY_FROM_INTL[pick('weekday')];
  if (weekday == null) {
    throw new Error(`روز هفته نامعتبر است: ${pick('weekday')}`);
  }
  return {
    year: Number(pick('year')),
    month: Number(pick('month')),
    day: Number(pick('day')),
    hour,
    minute: Number(pick('minute')),
    second: Number(pick('second')),
    weekday,
  };
}

export function pad2(value: number) {
  return String(value).padStart(2, '0');
}

export function clockText(hour: number, minute: number, second: number) {
  return `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
}

export function isoDate(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function isGregorianLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function gregorianMonthLength(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isJalaliLeapYear(year: number) {
  return isLeapJalaaliYear(year);
}

export function jalaliMonthDays(year: number, month: number) {
  return jalaaliMonthLength(year, month);
}

/** Noon-stable instant for a Tehran civil date under both +03:30 and former +04:30. */
export function instantForTehranDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 8, 30, 0));
}

export function addGregorianDays(
  year: number,
  month: number,
  day: number,
  delta: number,
) {
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + delta);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function describeCivilDay(input: {
  year: number;
  month: number;
  day: number;
  coverage: CalendarCoverageName;
  occasions: StoredOccasion[];
}) {
  const jalali = toJalaali(input.year, input.month, input.day);
  const tehran = tehranDateTime(
    instantForTehranDate(input.year, input.month, input.day),
  );
  const occasions = input.occasions.filter(
    (item) =>
      item.jalaliYear === jalali.jy &&
      item.jalaliMonth === jalali.jm &&
      item.jalaliDay === jalali.jd,
  );
  const officialHoliday = occasions.some((item) => item.isOfficialHoliday);
  const isFriday = tehran.weekday === 6;
  return {
    gregorian: {
      year: input.year,
      month: input.month,
      day: input.day,
      text: isoDate(input.year, input.month, input.day),
    },
    jalali: {
      year: jalali.jy,
      month: jalali.jm,
      day: jalali.jd,
      monthName: JALALI_MONTHS[jalali.jm - 1],
      text: `${jalali.jy}/${pad2(jalali.jm)}/${pad2(jalali.jd)}`,
    },
    weekday: tehran.weekday,
    weekdayName: JALALI_WEEKDAYS[tehran.weekday],
    isFriday,
    isWeeklyHoliday: isFriday,
    officialHoliday,
    isHoliday: isFriday || officialHoliday,
    occasionsStatus: input.coverage === 'unknown' ? 'unknown' : 'official',
    coverage: input.coverage,
    occasions,
  };
}

export function buildJalaliMonth(input: {
  year: number;
  month: number;
  coverage: CalendarCoverageName;
  occasions: StoredOccasion[];
}) {
  if (input.month < 1 || input.month > 12) {
    throw new Error('ماه شمسی نامعتبر است.');
  }
  const length = jalaaliMonthLength(input.year, input.month);
  const days = [];
  for (let day = 1; day <= length; day += 1) {
    if (!isValidJalaaliDate(input.year, input.month, day)) continue;
    const gregorian = toGregorian(input.year, input.month, day);
    days.push(
      describeCivilDay({
        year: gregorian.gy,
        month: gregorian.gm,
        day: gregorian.gd,
        coverage: input.coverage,
        occasions: input.occasions,
      }),
    );
  }
  return {
    year: input.year,
    month: input.month,
    monthName: JALALI_MONTHS[input.month - 1],
    length,
    leapYear: isLeapJalaaliYear(input.year),
    startsOn: days[0]?.weekday ?? 0,
    weekdays: [...JALALI_WEEKDAYS],
    days,
  };
}

export function gregorianFromJalali(year: number, month: number, day: number) {
  if (!isValidJalaaliDate(year, month, day)) return null;
  const date = toGregorian(year, month, day);
  return { year: date.gy, month: date.gm, day: date.gd };
}

/** Monotonic projection between server syncs. Device clock changes do not move this. */
export function projectedEpoch(
  syncEpochMs: number,
  monoAtSync: number,
  monoNow: number,
) {
  return syncEpochMs + (monoNow - monoAtSync);
}

export type ClockSnapshot = {
  epochMs: number;
  time: string;
  date: string;
};

/** Gregorian civil date in Asia/Tehran for a stored timestamp. */
export function tehranIsoDate(instant: Date) {
  const parts = tehranDateTime(instant);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function formatIsoAsJalali(iso: string | null | undefined) {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const jalali = toJalaali(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  );
  const fa = (value: number) =>
    String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] ?? digit);
  const month = JALALI_MONTHS[jalali.jm - 1];
  if (!month) return null;
  return `${fa(jalali.jd)} ${month} ${fa(jalali.jy)}`;
}

export function reduceClockSync<T extends ClockSnapshot>(
  previous: { snapshot: T | null; stale: boolean },
  next: { ok: true; snapshot: T } | { ok: false },
) {
  if (next.ok) return { snapshot: next.snapshot, stale: false };
  if (previous.snapshot) return { snapshot: previous.snapshot, stale: true };
  return { snapshot: null, stale: true };
}
