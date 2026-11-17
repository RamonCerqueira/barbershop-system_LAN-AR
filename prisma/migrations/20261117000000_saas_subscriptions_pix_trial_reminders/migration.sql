-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PENDING_PAYMENT', 'PAST_DUE', 'SUSPENDED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "companies"
ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
ADD COLUMN "trialStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "trialEndsAt" TIMESTAMP(3),
ADD COLUMN "subscriptionStartedAt" TIMESTAMP(3),
ADD COLUMN "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN "lastPaymentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT NOT NULL DEFAULT 'PIX',
    "pixKey" TEXT NOT NULL,
    "pixBeneficiary" TEXT NOT NULL,
    "pixBank" TEXT NOT NULL,
    "payerNote" TEXT,
    "proofFilePath" TEXT,
    "proofFileName" TEXT,
    "proofMimeType" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "rejectionReason" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_notification_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "subscriptionPaymentId" TEXT,
    "type" TEXT NOT NULL,
    "referenceDate" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "recipient" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "dedupKey" TEXT NOT NULL,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "companies_sub_trial_idx" ON "companies"("subscriptionStatus", "trialEndsAt");

-- CreateIndex
CREATE INDEX "companies_sub_period_idx" ON "companies"("subscriptionStatus", "currentPeriodEnd");

-- CreateIndex
CREATE INDEX "sub_payments_company_status_idx" ON "subscription_payments"("companyId", "status");

-- CreateIndex
CREATE INDEX "sub_payments_status_created_idx" ON "subscription_payments"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_notification_logs_dedupKey_key" ON "subscription_notification_logs"("dedupKey");

-- CreateIndex
CREATE INDEX "sub_notif_company_sent_idx" ON "subscription_notification_logs"("companyId", "sentAt");

-- CreateIndex
CREATE INDEX "sub_notif_type_ref_idx" ON "subscription_notification_logs"("type", "referenceDate");

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_notification_logs" ADD CONSTRAINT "subscription_notification_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
