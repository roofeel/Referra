-- Create table for Athena table DDL templates.
CREATE TABLE "AthenaTable" (
  "id" TEXT NOT NULL,
  "tableType" TEXT NOT NULL,
  "tableNamePattern" TEXT NOT NULL,
  "ddl" TEXT NOT NULL,
  "updatedBy" TEXT DEFAULT 'System',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AthenaTable_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AthenaTable_tableType_idx" ON "AthenaTable"("tableType");
CREATE INDEX "AthenaTable_updatedAt_idx" ON "AthenaTable"("updatedAt");
