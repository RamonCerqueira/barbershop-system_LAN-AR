ALTER TYPE "SalePaymentStatus" ADD VALUE 'REFUNDED';
ALTER TABLE "sales" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "sales" ADD COLUMN "stockDebited" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sales" ADD COLUMN "refundedAt" TIMESTAMP(3);
ALTER TABLE "sales" ADD COLUMN "refundReason" TEXT;
CREATE UNIQUE INDEX "sales_idempotencyKey_key" ON "sales"("idempotencyKey");
CREATE TABLE "audit_logs" ("id" TEXT PRIMARY KEY, "companyId" TEXT, "actorId" TEXT NOT NULL, "action" TEXT NOT NULL, "entityId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "audit_logs_companyId_createdAt_idx" ON "audit_logs"("companyId","createdAt");
CREATE TABLE "stock_movements" ("id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "productId" TEXT NOT NULL, "saleId" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "reason" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "stock_movements_companyId_productId_createdAt_idx" ON "stock_movements"("companyId","productId","createdAt");
-- Existing product sales already decremented stock in the previous implementation.
UPDATE "sales" SET "stockDebited" = true WHERE "type" = 'PRODUCT' AND EXISTS (SELECT 1 FROM "sale_items" i WHERE i."saleId" = "sales".id);
