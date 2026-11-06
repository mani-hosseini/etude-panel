-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing roster order by join date within each course
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "courseId" ORDER BY "joinedAt" ASC, "id" ASC) - 1 AS "rn"
  FROM "Enrollment"
)
UPDATE "Enrollment" AS e
SET "sortOrder" = ranked."rn"
FROM ranked
WHERE e."id" = ranked."id";

-- CreateIndex
CREATE INDEX "Enrollment_courseId_sortOrder_idx" ON "Enrollment"("courseId", "sortOrder");

-- DropIndex
DROP INDEX IF EXISTS "Enrollment_courseId_idx";
