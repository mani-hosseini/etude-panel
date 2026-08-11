-- AlterTable
ALTER TABLE "User" ADD COLUMN "phone" VARCHAR(16),
ADD COLUMN "nationalId" VARCHAR(10),
ADD COLUMN "address" VARCHAR(400);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_nationalId_key" ON "User"("nationalId");
