-- No rows are removed. Review legacy amounts before applying to a populated database.
ALTER TABLE "companies" ALTER COLUMN "planPrice" TYPE NUMERIC(12,2) USING ROUND("planPrice"::numeric,2);
ALTER TABLE "services" ALTER COLUMN "price" TYPE NUMERIC(12,2) USING ROUND("price"::numeric,2);
ALTER TABLE "service_costs" ALTER COLUMN "costPerUse" TYPE NUMERIC(12,2) USING ROUND("costPerUse"::numeric,2);
ALTER TABLE "employees" ALTER COLUMN "salary" TYPE NUMERIC(12,2) USING ROUND("salary"::numeric,2);
ALTER TABLE "employees" ALTER COLUMN "commissionRate" TYPE NUMERIC(12,2) USING ROUND("commissionRate"::numeric,2);
ALTER TABLE "products" ALTER COLUMN "price" TYPE NUMERIC(12,2) USING ROUND("price"::numeric,2);
ALTER TABLE "clients" ALTER COLUMN "totalSpent" TYPE NUMERIC(12,2) USING ROUND("totalSpent"::numeric,2);
ALTER TABLE "appointments" ALTER COLUMN "price" TYPE NUMERIC(12,2) USING ROUND("price"::numeric,2);
ALTER TABLE "sales" ALTER COLUMN "amount" TYPE NUMERIC(12,2) USING ROUND("amount"::numeric,2);
ALTER TABLE "sale_items" ALTER COLUMN "unitPrice" TYPE NUMERIC(12,2) USING ROUND("unitPrice"::numeric,2);
ALTER TABLE "sale_items" ALTER COLUMN "totalPrice" TYPE NUMERIC(12,2) USING ROUND("totalPrice"::numeric,2);
