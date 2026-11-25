CREATE TABLE "contract_acceptances" (
 "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "actorId" TEXT NOT NULL, "actorName" TEXT NOT NULL, "actorEmail" TEXT NOT NULL,
 "kind" TEXT NOT NULL, "version" TEXT NOT NULL, "privacyVersion" TEXT NOT NULL, "documentHash" TEXT NOT NULL, "content" TEXT NOT NULL,
 "plan" "Plan" NOT NULL, "amount" DECIMAL(12,2) NOT NULL, "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "paymentId" TEXT,
 CONSTRAINT "contract_acceptances_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "contract_acceptances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "contract_acceptances_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "subscription_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "contract_acceptances_paymentId_key" ON "contract_acceptances"("paymentId");
CREATE INDEX "contract_acceptances_companyId_acceptedAt_idx" ON "contract_acceptances"("companyId", "acceptedAt");

-- Update only unpaid trial references; paid contracts and payment snapshots are preserved.
UPDATE companies c SET "planPrice" = CASE c.plan
  WHEN 'MONTHLY' THEN 89.90 WHEN 'SEMIANNUAL' THEN 485.46 WHEN 'ANNUAL' THEN 916.98
  WHEN 'PRO_MONTHLY' THEN 129.90 WHEN 'PRO_SEMIANNUAL' THEN 701.46 WHEN 'PRO_ANNUAL' THEN 1324.98
  WHEN 'ELITE_MONTHLY' THEN 159.90 WHEN 'ELITE_SEMIANNUAL' THEN 863.46 WHEN 'ELITE_ANNUAL' THEN 1630.98
  ELSE c."planPrice" END
WHERE c."subscriptionStartedAt" IS NULL AND NOT EXISTS (SELECT 1 FROM subscription_payments p WHERE p."companyId"=c.id AND p.status='APPROVED');
