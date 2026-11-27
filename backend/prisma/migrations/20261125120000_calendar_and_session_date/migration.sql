-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN "heldOn" DATE;

-- CreateEnum
CREATE TYPE "CalendarOccasionKind" AS ENUM ('NATIONAL', 'RELIGIOUS', 'OFFICIAL');

-- CreateEnum
CREATE TYPE "CalendarCoverage" AS ENUM ('UNKNOWN', 'HOLIDAYS', 'COMPLETE');

-- CreateTable
CREATE TABLE "CalendarYearRecord" (
    "year" INTEGER NOT NULL,
    "coverage" "CalendarCoverage" NOT NULL DEFAULT 'UNKNOWN',
    "source" VARCHAR(300) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarYearRecord_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "CalendarOccasion" (
    "id" UUID NOT NULL,
    "gregorianDate" DATE NOT NULL,
    "jalaliYear" INTEGER NOT NULL,
    "jalaliMonth" INTEGER NOT NULL,
    "jalaliDay" INTEGER NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "kind" "CalendarOccasionKind" NOT NULL,
    "isOfficialHoliday" BOOLEAN NOT NULL DEFAULT false,
    "source" VARCHAR(300) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarOccasion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarOccasion_gregorianDate_title_key" ON "CalendarOccasion"("gregorianDate", "title");

-- CreateIndex
CREATE INDEX "CalendarOccasion_jalaliYear_jalaliMonth_jalaliDay_idx" ON "CalendarOccasion"("jalaliYear", "jalaliMonth", "jalaliDay");

-- CreateIndex
CREATE INDEX "CalendarOccasion_jalaliYear_idx" ON "CalendarOccasion"("jalaliYear");
