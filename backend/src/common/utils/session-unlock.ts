import { AttendanceStatus } from '@prisma/client';

export function courseUnlocksByClassHeld(course: {
  slug?: string | null;
  instrument?: string | null;
  title?: string | null;
}) {
  const blob = `${course.slug ?? ''} ${course.instrument ?? ''} ${course.title ?? ''}`;
  return !/theory|تئوری/i.test(blob);
}

export function classWasHeld(
  attendance?: AttendanceStatus | string | null,
) {
  const value = String(attendance ?? '').toUpperCase();
  return (
    value === AttendanceStatus.PRESENT || value === AttendanceStatus.LATE
  );
}

export function studentFacingSessionStatus(
  attendance?: AttendanceStatus | string | null,
): 'available' | 'locked' {
  return classWasHeld(attendance) ? 'available' : 'locked';
}
