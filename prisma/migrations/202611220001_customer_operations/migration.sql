-- AlterTable
ALTER TABLE "public"."clients" ADD COLUMN     "requireDeposit" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."appointments" ADD COLUMN     "depositAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "depositRequired" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."outbound_messages" ADD COLUMN     "customerAlertId" TEXT;

-- AlterTable
ALTER TABLE "public"."customer_accounts" ADD COLUMN     "reminderEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderWhatsapp" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."customer_alerts" (
    "appointmentVersion" TEXT,
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL DEFAULT '/cliente/agendamentos',
    "dedupKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "whatsappStatus" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "customer_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."waitlist_entries" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "offeredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."appointment_photos" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "publicationConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_alerts_dedupKey_key" ON "public"."customer_alerts"("dedupKey");

-- CreateIndex
CREATE INDEX "customer_alerts_customerId_createdAt_idx" ON "public"."customer_alerts"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "customer_alerts_emailStatus_createdAt_idx" ON "public"."customer_alerts"("emailStatus", "createdAt");

-- CreateIndex
CREATE INDEX "waitlist_entries_status_date_createdAt_idx" ON "public"."waitlist_entries"("status", "date", "createdAt");

-- CreateIndex
CREATE INDEX "waitlist_entries_companyId_employeeId_date_time_status_idx" ON "public"."waitlist_entries"("companyId", "employeeId", "date", "time", "status");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_customerId_companyId_serviceId_employeeId__key" ON "public"."waitlist_entries"("customerId", "companyId", "serviceId", "employeeId", "date", "time");

-- CreateIndex
CREATE INDEX "appointment_photos_appointmentId_idx" ON "public"."appointment_photos"("appointmentId");

-- AddForeignKey
ALTER TABLE "public"."customer_alerts" ADD CONSTRAINT "customer_alerts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."waitlist_entries" ADD CONSTRAINT "waitlist_entries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."waitlist_entries" ADD CONSTRAINT "waitlist_entries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointment_photos" ADD CONSTRAINT "appointment_photos_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
