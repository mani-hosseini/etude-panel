-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('ACTIVE', 'UPCOMING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('AVAILABLE', 'UPCOMING', 'LOCKED');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('DONE', 'NEXT', 'PLANNED');

-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('PRIVATE', 'GROUP', 'THEORY');

-- CreateEnum
CREATE TYPE "SlideKind" AS ENUM ('COVER', 'LESSON', 'VISUAL', 'OUTRO');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "firstName" VARCHAR(40) NOT NULL,
    "lastName" VARCHAR(40) NOT NULL,
    "displayName" VARCHAR(81) NOT NULL,
    "email" VARCHAR(255),
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "studentCode" VARCHAR(32),
    "level" VARCHAR(64),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" VARCHAR(512),
    "ipAddress" VARCHAR(64),

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "subtitle" VARCHAR(300) NOT NULL,
    "instrument" VARCHAR(64) NOT NULL,
    "teacher" VARCHAR(120) NOT NULL,
    "teacherShort" VARCHAR(80) NOT NULL,
    "day" VARCHAR(32) NOT NULL,
    "time" VARCHAR(64) NOT NULL,
    "timeShort" VARCHAR(32) NOT NULL,
    "duration" VARCHAR(32) NOT NULL,
    "room" VARCHAR(120) NOT NULL,
    "level" VARCHAR(64) NOT NULL,
    "focus" VARCHAR(300) NOT NULL,
    "sessionsTotal" INTEGER NOT NULL,
    "weeklyHours" INTEGER NOT NULL DEFAULT 2,
    "status" "CourseStatus" NOT NULL DEFAULT 'ACTIVE',
    "certificateReady" BOOLEAN NOT NULL DEFAULT false,
    "accessNote" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseSession" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL DEFAULT '',
    "summary" VARCHAR(1000) NOT NULL,
    "topics" TEXT[],
    "status" "SessionStatus" NOT NULL DEFAULT 'LOCKED',
    "durationLabel" VARCHAR(32) NOT NULL,
    "dateLabel" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slide" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "sourceId" VARCHAR(64) NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "chapter" VARCHAR(16) NOT NULL,
    "title" VARCHAR(400) NOT NULL,
    "goal" VARCHAR(1000) NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "bullets" TEXT[],
    "terms" JSONB NOT NULL,
    "mistakes" TEXT[],
    "imageHint" VARCHAR(500),
    "imageId" VARCHAR(64),
    "funFact" VARCHAR(1000),
    "kind" "SlideKind" NOT NULL DEFAULT 'LESSON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleLesson" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "sessionId" UUID,
    "title" VARCHAR(300) NOT NULL,
    "teacher" VARCHAR(120) NOT NULL,
    "day" VARCHAR(32) NOT NULL,
    "dateLabel" VARCHAR(64) NOT NULL,
    "time" VARCHAR(64) NOT NULL,
    "room" VARCHAR(120) NOT NULL,
    "type" "LessonType" NOT NULL DEFAULT 'THEORY',
    "duration" VARCHAR(32) NOT NULL,
    "note" VARCHAR(500),
    "status" "LessonStatus" NOT NULL DEFAULT 'PLANNED',
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500) NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "achievementId" UUID NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeTip" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "text" VARCHAR(500) NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "PracticeTip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionProgress" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "lastSlideIndex" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_studentCode_key" ON "User"("studentCode");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "User_firstName_lastName_key" ON "User"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "Course_status_isActive_idx" ON "Course"("status", "isActive");

-- CreateIndex
CREATE INDEX "Course_sortOrder_idx" ON "Course"("sortOrder");

-- CreateIndex
CREATE INDEX "Enrollment_courseId_idx" ON "Enrollment"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_userId_courseId_key" ON "Enrollment"("userId", "courseId");

-- CreateIndex
CREATE INDEX "CourseSession_status_idx" ON "CourseSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CourseSession_courseId_number_key" ON "CourseSession"("courseId", "number");

-- CreateIndex
CREATE INDEX "Slide_sessionId_sortOrder_idx" ON "Slide"("sessionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Slide_sessionId_sourceId_key" ON "Slide"("sessionId", "sourceId");

-- CreateIndex
CREATE INDEX "ScheduleLesson_courseId_sortOrder_idx" ON "ScheduleLesson"("courseId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_code_key" ON "Achievement"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "PracticeTip_courseId_sortOrder_idx" ON "PracticeTip"("courseId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SessionProgress_userId_sessionId_key" ON "SessionProgress"("userId", "sessionId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSession" ADD CONSTRAINT "CourseSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slide" ADD CONSTRAINT "Slide_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CourseSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleLesson" ADD CONSTRAINT "ScheduleLesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleLesson" ADD CONSTRAINT "ScheduleLesson_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CourseSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeTip" ADD CONSTRAINT "PracticeTip_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionProgress" ADD CONSTRAINT "SessionProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionProgress" ADD CONSTRAINT "SessionProgress_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CourseSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
