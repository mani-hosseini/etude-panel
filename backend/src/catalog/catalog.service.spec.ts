import { CatalogService } from './catalog.service';
import {
  LESSON_STATUS_API,
  SESSION_STATUS_API,
  toPersianDigits,
} from '../common/utils/mappers';

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
