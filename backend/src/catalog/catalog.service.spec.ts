import { CatalogService } from './catalog.service';
import {
  LESSON_STATUS_API,
  SESSION_STATUS_API,
  toPersianDigits,
} from '../common/utils/mappers';
import {
  formatTimeRange,
  normalizeClock,
  parseTimeRange,
} from '../common/utils/session-time';

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

describe('CatalogService', () => {
  it('defines core query methods', () => {
    expect(typeof CatalogService.prototype.getDashboard).toBe('function');
    expect(typeof CatalogService.prototype.listSessions).toBe('function');
    expect(typeof CatalogService.prototype.getSessionSlides).toBe('function');
    expect(typeof CatalogService.prototype.getSessionAttachments).toBe(
      'function',
    );
    expect(typeof CatalogService.prototype.getProfile).toBe('function');
  });
});
