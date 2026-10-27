-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceStatus') THEN
    CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'EXCUSED');
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PracticeAssignment" (
    "id" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "courseId" UUID,
    "category" VARCHAR(32) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "source" VARCHAR(200) NOT NULL DEFAULT '',
    "note" VARCHAR(1000) NOT NULL DEFAULT '',
    "dueLabel" VARCHAR(64) NOT NULL DEFAULT 'کلاس بعد',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PracticeAssignmentTarget" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PracticeAssignmentTarget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AttendanceRecord" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "meetingKey" VARCHAR(80) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "markedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TeacherNote" (
    "id" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "body" VARCHAR(2000) NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PracticeLog" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "minutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PracticeAssignmentTarget_assignmentId_studentId_key"
  ON "PracticeAssignmentTarget"("assignmentId", "studentId");
CREATE INDEX IF NOT EXISTS "PracticeAssignment_teacherId_createdAt_idx"
  ON "PracticeAssignment"("teacherId", "createdAt");
CREATE INDEX IF NOT EXISTS "PracticeAssignment_courseId_idx"
  ON "PracticeAssignment"("courseId");
CREATE INDEX IF NOT EXISTS "PracticeAssignmentTarget_studentId_idx"
  ON "PracticeAssignmentTarget"("studentId");
CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceRecord_courseId_studentId_meetingKey_key"
  ON "AttendanceRecord"("courseId", "studentId", "meetingKey");
CREATE INDEX IF NOT EXISTS "AttendanceRecord_courseId_meetingKey_idx"
  ON "AttendanceRecord"("courseId", "meetingKey");
CREATE INDEX IF NOT EXISTS "AttendanceRecord_studentId_idx"
  ON "AttendanceRecord"("studentId");
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherNote_teacherId_studentId_key"
  ON "TeacherNote"("teacherId", "studentId");
CREATE UNIQUE INDEX IF NOT EXISTS "PracticeLog_userId_date_key"
  ON "PracticeLog"("userId", "date");
CREATE INDEX IF NOT EXISTS "PracticeLog_userId_date_idx"
  ON "PracticeLog"("userId", "date");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PracticeAssignment_teacherId_fkey') THEN
    ALTER TABLE "PracticeAssignment"
      ADD CONSTRAINT "PracticeAssignment_teacherId_fkey"
      FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PracticeAssignment_courseId_fkey') THEN
    ALTER TABLE "PracticeAssignment"
      ADD CONSTRAINT "PracticeAssignment_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PracticeAssignmentTarget_assignmentId_fkey') THEN
    ALTER TABLE "PracticeAssignmentTarget"
      ADD CONSTRAINT "PracticeAssignmentTarget_assignmentId_fkey"
      FOREIGN KEY ("assignmentId") REFERENCES "PracticeAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PracticeAssignmentTarget_studentId_fkey') THEN
    ALTER TABLE "PracticeAssignmentTarget"
      ADD CONSTRAINT "PracticeAssignmentTarget_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AttendanceRecord_courseId_fkey') THEN
    ALTER TABLE "AttendanceRecord"
      ADD CONSTRAINT "AttendanceRecord_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AttendanceRecord_studentId_fkey') THEN
    ALTER TABLE "AttendanceRecord"
      ADD CONSTRAINT "AttendanceRecord_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AttendanceRecord_markedById_fkey') THEN
    ALTER TABLE "AttendanceRecord"
      ADD CONSTRAINT "AttendanceRecord_markedById_fkey"
      FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherNote_teacherId_fkey') THEN
    ALTER TABLE "TeacherNote"
      ADD CONSTRAINT "TeacherNote_teacherId_fkey"
      FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherNote_studentId_fkey') THEN
    ALTER TABLE "TeacherNote"
      ADD CONSTRAINT "TeacherNote_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PracticeLog_userId_fkey') THEN
    ALTER TABLE "PracticeLog"
      ADD CONSTRAINT "PracticeLog_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
