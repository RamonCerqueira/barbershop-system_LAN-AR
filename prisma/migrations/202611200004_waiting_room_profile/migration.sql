ALTER TABLE "companies" ADD COLUMN "waitingRoomEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "waitingRoomToken" TEXT, ADD COLUMN "waitingRoomCalledId" TEXT, ADD COLUMN "waitingRoomCalledAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "companies_waitingRoomToken_key" ON "companies"("waitingRoomToken");
ALTER TABLE "users" ADD COLUMN "avatarPath" TEXT;
