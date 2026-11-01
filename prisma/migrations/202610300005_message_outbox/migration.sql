ALTER TYPE "CampaignStatus" ADD VALUE 'QUEUED';
ALTER TABLE "clients" ADD COLUMN "whatsappConsent" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "outbound_messages" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "clientId" TEXT, "campaignId" TEXT,
 "to" TEXT NOT NULL, "message" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'QUEUED',
 "dedupKey" TEXT NOT NULL, "providerId" TEXT, "attempts" INTEGER NOT NULL DEFAULT 0,
 "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "outbound_messages_dedupKey_key" ON "outbound_messages"("dedupKey");
CREATE UNIQUE INDEX "outbound_messages_providerId_key" ON "outbound_messages"("providerId");
CREATE INDEX "outbound_messages_status_nextAttemptAt_idx" ON "outbound_messages"("status","nextAttemptAt");
