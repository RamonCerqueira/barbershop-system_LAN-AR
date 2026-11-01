-- AlterTable
ALTER TABLE "public"."clients" ADD COLUMN     "notes" TEXT,
ALTER COLUMN "rating" SET DEFAULT 5;

-- AlterTable
ALTER TABLE "public"."company_settings" ADD COLUMN     "notificationConfig" JSONB;

-- AlterTable
ALTER TABLE "public"."employees" ADD COLUMN     "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "salary" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."products" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "public"."sales" ADD COLUMN     "appointmentId" TEXT;

-- AlterTable
ALTER TABLE "public"."services" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'Cabelo';

-- AlterTable
ALTER TABLE "public"."whatsapp_campaign_logs" ADD COLUMN     "errorMessage" TEXT;

-- AlterTable
ALTER TABLE "public"."whatsapp_campaigns" ADD COLUMN     "lastSent" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."password_resets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_userId_key" ON "public"."password_resets"("userId");

-- AddForeignKey
ALTER TABLE "public"."password_resets" ADD CONSTRAINT "password_resets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sales" ADD CONSTRAINT "sales_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."company_settings" ADD CONSTRAINT "company_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

