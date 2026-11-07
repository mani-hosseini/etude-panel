-- CreateEnum
CREATE TYPE "SupportUnit" AS ENUM ('EDUCATION', 'FINANCE', 'RECEPTION', 'TECH');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('PENDING', 'REPLIED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportMessageAuthor" AS ENUM ('STUDENT', 'STAFF');

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "unit" "SupportUnit" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'PENDING',
    "unreadForStudent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "author" "SupportMessageAuthor" NOT NULL,
    "body" VARCHAR(4000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportTicket_studentId_updatedAt_idx" ON "SupportTicket"("studentId", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportTicket_status_updatedAt_idx" ON "SupportTicket"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportTicket_unit_status_idx" ON "SupportTicket"("unit", "status");

-- CreateIndex
CREATE INDEX "SupportTicket_unreadForStudent_idx" ON "SupportTicket"("unreadForStudent");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
