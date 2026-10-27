UPDATE "User" SET "nationalId" = NULL WHERE "nationalId" = '';

CREATE UNIQUE INDEX "User_nationalId_key" ON "User"("nationalId");
