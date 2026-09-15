-- CreateTable
CREATE TABLE "ExamGrade" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "score" DECIMAL(4,1) NOT NULL,
    "gradedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamGrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamGrade_examId_userId_key" ON "ExamGrade"("examId", "userId");

-- CreateIndex
CREATE INDEX "ExamGrade_userId_idx" ON "ExamGrade"("userId");

-- AddForeignKey
ALTER TABLE "ExamGrade" ADD CONSTRAINT "ExamGrade_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamGrade" ADD CONSTRAINT "ExamGrade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Copy any grades that were stored on PDF submissions
INSERT INTO "ExamGrade" ("id", "examId", "userId", "score", "gradedAt", "updatedAt")
SELECT gen_random_uuid(), "examId", "userId", "score", COALESCE("gradedAt", CURRENT_TIMESTAMP), CURRENT_TIMESTAMP
FROM "ExamSubmission"
WHERE "score" IS NOT NULL
ON CONFLICT ("examId", "userId") DO NOTHING;

-- AlterTable
ALTER TABLE "ExamSubmission" DROP COLUMN IF EXISTS "score",
DROP COLUMN IF EXISTS "gradedAt";
