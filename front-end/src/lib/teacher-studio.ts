export function studentDisplayName(student: {
  firstName: string;
  lastName: string;
  displayName?: string;
}) {
  return student.displayName?.trim() || `${student.firstName} ${student.lastName}`;
}
