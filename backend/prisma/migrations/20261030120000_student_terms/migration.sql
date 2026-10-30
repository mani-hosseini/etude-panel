ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "currentTerm" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "PracticeAssignment" ADD COLUMN IF NOT EXISTS "term" INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS "PracticeAssignment_courseId_term_idx" ON "PracticeAssignment"("courseId", "term");

ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "term" INTEGER NOT NULL DEFAULT 1;

DROP INDEX IF EXISTS "AttendanceRecord_courseId_studentId_meetingKey_key";
CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceRecord_courseId_studentId_meetingKey_term_key"
  ON "AttendanceRecord"("courseId", "studentId", "meetingKey", "term");
