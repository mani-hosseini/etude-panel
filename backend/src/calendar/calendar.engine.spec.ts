import { OFFICIAL_1405_HOLIDAYS, OFFICIAL_1405_SOURCE } from './official-1405';
import {
  addGregorianDays,
  buildJalaliMonth,
  describeCivilDay,
  gregorianMonthLength,
  isGregorianLeapYear,
  isJalaliLeapYear,
  jalaliMonthDays,
  projectedEpoch,
  reduceClockSync,
  tehranDateTime,
  type StoredOccasion,
} from './calendar.engine';

const holidays: StoredOccasion[] = OFFICIAL_1405_HOLIDAYS.map((item) => ({
  jalaliYear: 1405,
  jalaliMonth: item.month,
  jalaliDay: item.day,
  title: item.title,
  kind: item.kind,
  isOfficialHoliday: true,
  source: OFFICIAL_1405_SOURCE,
}));

describe('Tehran calendar engine', () => {
  it('rolls the civil date at Tehran midnight, not at UTC midnight', () => {
    const before = tehranDateTime(new Date('2026-03-20T20:29:59.000Z'));
    const after = tehranDateTime(new Date('2026-03-20T20:30:00.000Z'));
    expect(before).toMatchObject({
      year: 2026,
      month: 3,
      day: 20,
      hour: 23,
      minute: 59,
      second: 59,
    });
    expect(after).toMatchObject({
      year: 2026,
      month: 3,
      day: 21,
      hour: 0,
      minute: 0,
      second: 0,
    });
    expect(before.day).not.toBe(after.day);
  });

  it('starts Nowruz 1405 on 21 March 2026', () => {
    const day = describeCivilDay({
      year: 2026,
      month: 3,
      day: 21,
      coverage: 'holidays',
      occasions: holidays,
    });
    expect(day.jalali).toMatchObject({ year: 1405, month: 1, day: 1 });
    expect(day.officialHoliday).toBe(true);
    expect(day.occasions.map((item) => item.title)).toContain(
      'عید سعید فطر و آغاز نوروز',
    );
  });

  it('ends Farvardin on day 31 and the next day is Ordibehesht', () => {
    expect(jalaliMonthDays(1405, 1)).toBe(31);
    const last = describeCivilDay({
      year: 2026,
      month: 4,
      day: 20,
      coverage: 'unknown',
      occasions: [],
    });
    expect(last.jalali).toMatchObject({ month: 1, day: 31 });
    const nextCivil = addGregorianDays(2026, 4, 20, 1);
    const next = describeCivilDay({
      ...nextCivil,
      coverage: 'unknown',
      occasions: [],
    });
    expect(next.jalali).toMatchObject({ year: 1405, month: 2, day: 1 });
  });

  it('treats 1403 as a Jalali leap year and 1404 as a common year', () => {
    expect(isJalaliLeapYear(1403)).toBe(true);
    expect(isJalaliLeapYear(1404)).toBe(false);
    expect(jalaliMonthDays(1403, 12)).toBe(30);
    expect(jalaliMonthDays(1404, 12)).toBe(29);
    const lastLeap = describeCivilDay({
      year: 2025,
      month: 3,
      day: 20,
      coverage: 'unknown',
      occasions: [],
    });
    expect(lastLeap.jalali).toMatchObject({ year: 1403, month: 12, day: 30 });
    const newYear = addGregorianDays(2025, 3, 20, 1);
    expect(
      describeCivilDay({ ...newYear, coverage: 'unknown', occasions: [] }).jalali,
    ).toMatchObject({ year: 1404, month: 1, day: 1 });
  });

  it('knows Gregorian leap days without using the host timezone', () => {
    expect(isGregorianLeapYear(2024)).toBe(true);
    expect(isGregorianLeapYear(1900)).toBe(false);
    expect(isGregorianLeapYear(2000)).toBe(true);
    expect(gregorianMonthLength(2024, 2)).toBe(29);
    expect(gregorianMonthLength(2026, 2)).toBe(28);
    expect(gregorianMonthLength(1900, 2)).toBe(28);
  });

  it('marks Fridays as the weekly holiday', () => {
    const friday = describeCivilDay({
      year: 2026,
      month: 3,
      day: 20,
      coverage: 'unknown',
      occasions: [],
    });
    expect(friday.weekdayName).toBe('جمعه');
    expect(friday.isFriday).toBe(true);
    expect(friday.isHoliday).toBe(true);
    expect(friday.officialHoliday).toBe(false);
    expect(friday.occasionsStatus).toBe('unknown');
  });

  it('marks an official holiday in red-worthy state and keeps its source', () => {
    const day = describeCivilDay({
      year: 2027,
      month: 2,
      day: 11,
      coverage: 'holidays',
      occasions: holidays,
    });
    expect(day.jalali).toMatchObject({ year: 1405, month: 11, day: 22 });
    expect(day.officialHoliday).toBe(true);
    expect(day.occasions[0]?.source).toContain('ژئوفیزیک');
  });

  it('reports an unknown occasion status when the year was not imported', () => {
    const month = buildJalaliMonth({
      year: 1406,
      month: 1,
      coverage: 'unknown',
      occasions: [],
    });
    expect(month.length).toBe(31);
    expect(month.days.every((day) => day.occasionsStatus === 'unknown')).toBe(
      true,
    );
    expect(month.days.some((day) => day.isFriday && day.isHoliday)).toBe(true);
  });

  it('keeps the clock on the monotonic offset when the device clock jumps', () => {
    const synced = projectedEpoch(1_700_000_000_000, 1_000, 4_000);
    expect(synced).toBe(1_700_000_003_000);
    const jumpedDeviceWallClock = synced + 60 * 60 * 1000;
    expect(projectedEpoch(1_700_000_000_000, 1_000, 4_000)).not.toBe(
      jumpedDeviceWallClock,
    );
  });

  it('keeps the last snapshot when the backend is temporarily unreachable', () => {
    const live = reduceClockSync(
      { snapshot: null, stale: false },
      { ok: true, snapshot: { epochMs: 10, time: '12:00:00', date: '1405/01/01' } },
    );
    const dropped = reduceClockSync(live, { ok: false });
    expect(dropped.stale).toBe(true);
    expect(dropped.snapshot?.time).toBe('12:00:00');
    const stillDown = reduceClockSync(
      { snapshot: null, stale: false },
      { ok: false },
    );
    expect(stillDown.snapshot).toBeNull();
    expect(stillDown.stale).toBe(true);
  });
});
