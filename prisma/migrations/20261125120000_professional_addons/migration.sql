ALTER TABLE "companies" ADD COLUMN "additionalProfessionals" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "subscription_payments" ADD COLUMN "additionalProfessionals" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "additionalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "companies" ADD CONSTRAINT "companies_additional_professionals_nonnegative" CHECK ("additionalProfessionals" >= 0);
