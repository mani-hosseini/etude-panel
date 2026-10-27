import { CatalogService } from './catalog.service';
import {
  LESSON_STATUS_API,
  SESSION_STATUS_API,
  slideProgressPercent,
  toPersianDigits,
} from '../common/utils/mappers';
import {
  formatTimeRange,
  normalizeClock,
  parseTimeRange,
} from '../common/utils/session-time';
import {
  classWasHeld,
  courseUnlocksByClassHeld,
  studentFacingSessionStatus,
} from '../common/utils/session-unlock';

describe('Catalog mappers', () => {
  it('maps session statuses for frontend', () => {
    expect(SESSION_STATUS_API.AVAILABLE).toBe('available');
    expect(SESSION_STATUS_API.LOCKED).toBe('locked');
    expect(LESSON_STATUS_API.NEXT).toBe('next');
  });

  it('converts digits to Persian', () => {
    expect(toPersianDigits(10)).toBe('۱۰');
    expect(toPersianDigits('25%')).toBe('۲۵%');
  });
});

describe('session time helpers', () => {
  it('formats a clock range in Persian', () => {
    expect(formatTimeRange('11:00', '13:00')).toBe('۱۱ تا ۱۳');
    expect(formatTimeRange('16:00', '17:30')).toBe('۱۶ تا ۱۷:۳۰');
  });

  it('parses Persian range labels', () => {
    expect(parseTimeRange('۱۱ تا ۱۳')).toEqual({
      start: '11:00',
      end: '13:00',
    });
    expect(parseTimeRange('۱۶ تا ۱۷:۳۰')).toEqual({
      start: '16:00',
      end: '17:30',
    });
  });

  it('normalizes clock values', () => {
    expect(normalizeClock('9:05')).toBe('09:05');
    expect(normalizeClock('')).toBeNull();
  });
});

describe('slideProgressPercent', () => {
  it('uses farthest viewed index and never drops after completion', () => {
    expect(slideProgressPercent(0, 10)).toBe(10);
    expect(slideProgressPercent(4, 10)).toBe(50);
    expect(slideProgressPercent(9, 10)).toBe(100);
    expect(slideProgressPercent(0, 10, new Date())).toBe(100);
  });
});

describe('session unlock', () => {
  it('unlocks piano sessions only after class was held', () => {
    expect(courseUnlocksByClassHeld({ slug: 'piano', instrument: 'پیانو' })).toBe(
      true,
    );
    expect(
      courseUnlocksByClassHeld({
        slug: 'theory-basics',
        title: 'مستر کلاس تئوری موسیقی',
      }),
    ).toBe(false);
    expect(classWasHeld('PRESENT')).toBe(true);
    expect(classWasHeld('absent')).toBe(false);
    expect(studentFacingSessionStatus('present')).toBe('available');
    expect(studentFacingSessionStatus(null)).toBe('locked');
  });
});

describe('CatalogService', () => {
  it('defines core query methods', () => {
    expect(typeof CatalogService.prototype.getDashboard).toBe('function');
    expect(typeof CatalogService.prototype.listSessions).toBe('function');
    expect(typeof CatalogService.prototype.getSessionSlides).toBe('function');
    expect(typeof CatalogService.prototype.getSessionAttachments).toBe(
      'function',
    );
    expect(typeof CatalogService.prototype.getSessionExercises).toBe(
      'function',
    );
    expect(typeof CatalogService.prototype.getProfile).toBe('function');
  });
});
