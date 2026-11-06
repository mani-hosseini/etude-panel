-- CreateEnum
CREATE TYPE "RegistrationLeadStatus" AS ENUM ('CONSULTING', 'DECIDING', 'ENROLLED', 'LOST');

-- CreateEnum
CREATE TYPE "ReferralSource" AS ENUM ('INSTAGRAM', 'GOOGLE', 'STUDENT_REFERRAL', 'FRIEND_FAMILY', 'ADS', 'WEBSITE', 'INBOUND_CALL', 'WALK_IN', 'OTHER');

-- CreateEnum
CREATE TYPE "CourseInterest" AS ENUM ('PIANO', 'THEORY', 'BOTH', 'UNDECIDED');

-- CreateEnum
CREATE TYPE "TimePreference" AS ENUM ('MORNING', 'EVENING', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "AdminTaskKind" AS ENUM ('MANUAL', 'ENROLLMENT');

-- CreateEnum
CREATE TYPE "AdminTaskStatus" AS ENUM ('OPEN', 'DONE');

-- CreateTable
CREATE TABLE "RegistrationLead" (
    "id" UUID NOT NULL,
    "contactDate" DATE NOT NULL,
    "firstName" VARCHAR(40) NOT NULL,
    "lastName" VARCHAR(40) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "secondaryPhone" VARCHAR(32) NOT NULL DEFAULT '',
    "parentName" VARCHAR(80) NOT NULL DEFAULT '',
    "age" VARCHAR(8) NOT NULL DEFAULT '',
    "district" VARCHAR(16) NOT NULL,
    "referralSource" "ReferralSource" NOT NULL DEFAULT 'INBOUND_CALL',
    "status" "RegistrationLeadStatus" NOT NULL DEFAULT 'CONSULTING',
    "interest" "CourseInterest" NOT NULL DEFAULT 'PIANO',
    "preferredDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timePreference" "TimePreference" NOT NULL DEFAULT 'FLEXIBLE',
    "followUpDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationLeadNote" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "text" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationLeadNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminTask" (
    "id" UUID NOT NULL,
    "kind" "AdminTaskKind" NOT NULL DEFAULT 'MANUAL',
    "status" "AdminTaskStatus" NOT NULL DEFAULT 'OPEN',
    "title" VARCHAR(200) NOT NULL,
    "body" VARCHAR(2000) NOT NULL DEFAULT '',
    "dueDate" DATE,
    "phone" VARCHAR(32),
    "leadId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "AdminTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistrationLead_status_idx" ON "RegistrationLead"("status");

-- CreateIndex
CREATE INDEX "RegistrationLead_followUpDate_idx" ON "RegistrationLead"("followUpDate");

-- CreateIndex
CREATE INDEX "RegistrationLead_createdAt_idx" ON "RegistrationLead"("createdAt");

-- CreateIndex
CREATE INDEX "RegistrationLeadNote_leadId_createdAt_idx" ON "RegistrationLeadNote"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminTask_leadId_kind_key" ON "AdminTask"("leadId", "kind");

-- CreateIndex
CREATE INDEX "AdminTask_status_createdAt_idx" ON "AdminTask"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AdminTask_kind_status_idx" ON "AdminTask"("kind", "status");

-- AddForeignKey
ALTER TABLE "RegistrationLeadNote" ADD CONSTRAINT "RegistrationLeadNote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "RegistrationLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminTask" ADD CONSTRAINT "AdminTask_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "RegistrationLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
