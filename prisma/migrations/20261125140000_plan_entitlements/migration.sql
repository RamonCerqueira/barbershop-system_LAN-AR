ALTER TABLE "companies" ADD COLUMN "pendingPlan" "Plan", ADD COLUMN "pendingPlanStartsAt" TIMESTAMP(3);
ALTER TABLE "subscription_payments" ADD COLUMN "baseAmount" DECIMAL(12,2), ADD COLUMN "discountPercent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "outbound_messages" ADD COLUMN "instanceName" TEXT, ADD COLUMN "acceptedAt" TIMESTAMP(3), ADD COLUMN "quotaMonth" TEXT;
CREATE INDEX "outbound_messages_companyId_quotaMonth_status_idx" ON "outbound_messages"("companyId", "quotaMonth", "status");
CREATE TABLE "whatsapp_connections" ("companyId" TEXT NOT NULL, "instanceName" TEXT NOT NULL, "generation" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "whatsapp_connections_pkey" PRIMARY KEY ("companyId"));
CREATE UNIQUE INDEX "whatsapp_connections_instanceName_key" ON "whatsapp_connections"("instanceName");

ALTER TABLE "outbound_messages" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'TENANT';

ALTER TABLE "outbound_messages" ADD COLUMN "appointmentId" TEXT, ADD COLUMN "appointmentVersion" TEXT;

ALTER TABLE "companies" ADD COLUMN "pendingPlanPrice" DECIMAL(12,2);
