CREATE TABLE IF NOT EXISTS "StudentStarRating" (
    "id" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentStarRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentStarRating_teacherId_studentId_key"
  ON "StudentStarRating"("teacherId", "studentId");
CREATE INDEX IF NOT EXISTS "StudentStarRating_studentId_idx"
  ON "StudentStarRating"("studentId");

ALTER TABLE "StudentStarRating"
  ADD CONSTRAINT "StudentStarRating_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentStarRating"
  ADD CONSTRAINT "StudentStarRating_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
