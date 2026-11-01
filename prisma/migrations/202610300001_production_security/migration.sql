-- Existing installs created with db push may already contain these payment fields.
DO $$ BEGIN
  CREATE TYPE "SalePaymentStatus" AS ENUM ('PENDING','APPROVED','REJECTED','COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "status" "SalePaymentStatus" NOT NULL DEFAULT 'COMPLETED';
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "proofUrl" TEXT;

CREATE TABLE "auth_sessions" (
  "id" TEXT PRIMARY KEY, "subjectId" TEXT NOT NULL, "subjectType" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "auth_sessions_subjectId_subjectType_idx" ON "auth_sessions"("subjectId","subjectType");
CREATE INDEX "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");
CREATE TABLE "rate_limit_buckets" ("id" TEXT PRIMARY KEY, "count" INTEGER NOT NULL DEFAULT 1, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "rate_limit_buckets_expiresAt_idx" ON "rate_limit_buckets"("expiresAt");
CREATE TABLE "recovery_tokens" (
  "id" TEXT PRIMARY KEY, "subjectId" TEXT NOT NULL, "subjectType" TEXT NOT NULL, "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "consumedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "recovery_tokens_tokenHash_key" ON "recovery_tokens"("tokenHash");
CREATE INDEX "recovery_tokens_subjectId_subjectType_idx" ON "recovery_tokens"("subjectId","subjectType");
CREATE INDEX "recovery_tokens_expiresAt_idx" ON "recovery_tokens"("expiresAt");
ALTER TABLE "appointments" ADD COLUMN "confirmationHash" TEXT;
ALTER TABLE "appointments" ADD COLUMN "confirmationExpiresAt" TIMESTAMP(3);
ALTER TABLE "appointments" ADD COLUMN "duration" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "appointments" ADD COLUMN "idempotencyKey" TEXT;
UPDATE "appointments" a SET "duration" = GREATEST(1,s."duration") FROM "services" s WHERE s.id = a."serviceId";
CREATE UNIQUE INDEX "appointments_confirmationHash_key" ON "appointments"("confirmationHash");
CREATE UNIQUE INDEX "appointments_idempotencyKey_key" ON "appointments"("idempotencyKey");
CREATE INDEX "appointments_company_employee_date_idx" ON "appointments"("companyId","employeeId","date");
CREATE INDEX "sales_company_createdAt_idx" ON "sales"("companyId","createdAt");
CREATE INDEX "clients_company_phone_idx" ON "clients"("companyId","phone");
