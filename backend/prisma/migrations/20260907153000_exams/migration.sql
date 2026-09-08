-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateTable
CREATE TABLE "Exam" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000) NOT NULL DEFAULT '',
    "examImagePath" VARCHAR(512) NOT NULL DEFAULT '',
    "answerImagePath" VARCHAR(512) NOT NULL DEFAULT '',
    "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
    "dueAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSubmission" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fileKey" VARCHAR(512) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(64) NOT NULL,
    "size" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Exam_status_sortOrder_idx" ON "Exam"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "ExamSubmission_examId_submittedAt_idx" ON "ExamSubmission"("examId", "submittedAt");

-- CreateIndex
CREATE INDEX "ExamSubmission_userId_idx" ON "ExamSubmission"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSubmission_examId_userId_key" ON "ExamSubmission"("examId", "userId");

-- AddForeignKey
ALTER TABLE "ExamSubmission" ADD CONSTRAINT "ExamSubmission_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSubmission" ADD CONSTRAINT "ExamSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
