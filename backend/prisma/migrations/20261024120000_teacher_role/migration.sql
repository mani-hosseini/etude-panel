-- AlterEnum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'TEACHER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "title" VARCHAR(120);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "instrument" VARCHAR(64);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "room" VARCHAR(120);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" VARCHAR(1000);

-- AlterTable
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "teacherId" UUID;

CREATE INDEX IF NOT EXISTS "Course_teacherId_idx" ON "Course"("teacherId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Course_teacherId_fkey'
  ) THEN
    ALTER TABLE "Course"
      ADD CONSTRAINT "Course_teacherId_fkey"
      FOREIGN KEY ("teacherId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
