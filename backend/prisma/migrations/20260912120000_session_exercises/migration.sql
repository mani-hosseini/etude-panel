-- CreateTable
CREATE TABLE "SessionExercise" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "path" VARCHAR(512) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(64) NOT NULL,
    "size" INTEGER NOT NULL,
    "caption" VARCHAR(200),
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionExercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionExercise_sessionId_sortOrder_idx" ON "SessionExercise"("sessionId", "sortOrder");

-- AddForeignKey
ALTER TABLE "SessionExercise" ADD CONSTRAINT "SessionExercise_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CourseSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
