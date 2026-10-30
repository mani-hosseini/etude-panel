import {
  classWasHeld,
  courseUnlocksByClassHeld,
  previousSessionForReview,
  studentFacingSessionStatus,
} from './session-unlock';

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

  it('grades previous-session homework and wraps the last session onto the next term', () => {
    const sessions = Array.from({ length: 8 }, (_, index) => ({
      id: `s${index + 1}`,
      number: index + 1,
      courseId: 'piano',
    }));
    expect(previousSessionForReview(sessions, sessions[1], 1)?.number).toBe(1);
    expect(previousSessionForReview(sessions, sessions[7], 1)?.number).toBe(7);
    expect(previousSessionForReview(sessions, sessions[0], 1)).toBe(null);
    expect(previousSessionForReview(sessions, sessions[0], 2)?.number).toBe(8);
    expect(previousSessionForReview(sessions.slice(0, 1), sessions[0], 2)).toBe(
      null,
    );
  });
});
