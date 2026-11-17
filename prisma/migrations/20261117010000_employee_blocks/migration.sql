-- CreateTable
CREATE TABLE "employee_blocks" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_blocks_comp_emp_date_idx" ON "employee_blocks"("companyId", "employeeId", "date");

-- AddForeignKey
ALTER TABLE "employee_blocks" ADD CONSTRAINT "employee_blocks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_blocks" ADD CONSTRAINT "employee_blocks_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
