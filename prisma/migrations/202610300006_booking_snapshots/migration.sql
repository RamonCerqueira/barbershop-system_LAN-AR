ALTER TABLE "appointments" ADD COLUMN "serviceNameSnapshot" TEXT NOT NULL DEFAULT '';
ALTER TABLE "appointments" ADD COLUMN "employeeNameSnapshot" TEXT NOT NULL DEFAULT '';
ALTER TABLE "appointments" ADD COLUMN "costSnapshot" NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "appointments" ADD COLUMN "commissionSnapshot" NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "appointments" ADD COLUMN "snapshotEstimated" BOOLEAN NOT NULL DEFAULT false;
-- Historical costs cannot be reconstructed: mark the backfilled baseline as estimated.
UPDATE "appointments" a SET "serviceNameSnapshot"=s.name,"employeeNameSnapshot"=e.name,"snapshotEstimated"=true,
"costSnapshot"=COALESCE((SELECT SUM(c."costPerUse") FROM "service_costs" c WHERE c."serviceId"=s.id AND c."isActive"=true),0),
"commissionSnapshot"=ROUND(a.price*e."commissionRate"/100,2)
FROM "services" s,"employees" e WHERE s.id=a."serviceId" AND e.id=a."employeeId";
