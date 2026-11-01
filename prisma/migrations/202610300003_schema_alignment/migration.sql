-- Align clean installations with fields previously added through db push.
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "clients" ALTER COLUMN "rating" SET DEFAULT 5;
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "notificationConfig" JSONB;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "salary" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "appointmentId" TEXT;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'Cabelo';
ALTER TABLE "whatsapp_campaign_logs" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;
ALTER TABLE "whatsapp_campaigns" ADD COLUMN IF NOT EXISTS "lastSent" TIMESTAMP(3);
CREATE TABLE IF NOT EXISTS "password_resets" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "code" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "password_resets_userId_key" ON "password_resets"("userId");
DO $$ BEGIN ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sales" ADD CONSTRAINT "sales_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "notifications" ADD CONSTRAINT "notifications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
