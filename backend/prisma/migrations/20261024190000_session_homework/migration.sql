-- AlterTable
ALTER TABLE "CourseSession" ADD COLUMN "homeworkTitle" VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE "CourseSession" ADD COLUMN "homeworkSource" VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE "CourseSession" ADD COLUMN "homeworkNote" VARCHAR(1000) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "PracticeAssignment" ADD COLUMN "sessionId" UUID;

-- CreateIndex
CREATE INDEX "PracticeAssignment_sessionId_idx" ON "PracticeAssignment"("sessionId");

-- AddForeignKey
ALTER TABLE "PracticeAssignment" ADD CONSTRAINT "PracticeAssignment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CourseSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
