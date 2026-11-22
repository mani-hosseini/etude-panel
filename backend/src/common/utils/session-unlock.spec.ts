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

  it('rolls homework review past consecutive absences to the last held session', () => {
    const sessions = [
      { id: 's3', number: 3, courseId: 'piano', attendance: 'present' },
      { id: 's4', number: 4, courseId: 'piano', attendance: 'present' },
      { id: 's5', number: 5, courseId: 'piano', attendance: 'absent' },
      { id: 's6', number: 6, courseId: 'piano', attendance: null },
      { id: 's7', number: 7, courseId: 'piano', attendance: 'absent' },
      { id: 's8', number: 8, courseId: 'piano', attendance: null },
    ];
    // On session 6 after absence on 5 → review homework from session 4
    expect(previousSessionForReview(sessions, sessions[3], 1)?.number).toBe(4);
    // On session 8 after absences on 7 and 5 → still lands on last held (4)
    // when 6 was never marked held; 6 is null so it is the review candidate
    expect(previousSessionForReview(sessions, sessions[5], 1)?.number).toBe(6);
    // Consecutive absences 5 then 6: mark 6 absent and open 7 → review 4
    const withAbsent6 = sessions.map((item) =>
      item.number === 6 ? { ...item, attendance: 'absent' } : item,
    );
    expect(
      previousSessionForReview(withAbsent6, withAbsent6[4], 1)?.number,
    ).toBe(4);
  });
});
