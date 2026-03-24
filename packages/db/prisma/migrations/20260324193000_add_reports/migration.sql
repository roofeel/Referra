-- CreateTable
CREATE TABLE "Report" (
  "id" TEXT NOT NULL,
  "clientId" TEXT,
  "taskName" TEXT NOT NULL,
  "ruleName" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'CSV Import',
  "sourceIcon" TEXT NOT NULL DEFAULT 'description',
  "status" TEXT NOT NULL DEFAULT 'Running',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "progressLabel" TEXT NOT NULL DEFAULT '0% Processed',
  "attribution" TEXT NOT NULL DEFAULT '--',
  "attributionLogic" TEXT NOT NULL,
  "fieldMappings" JSONB NOT NULL,
  "uploadedFileName" TEXT NOT NULL,
  "uploadedFilePath" TEXT NOT NULL,
  "uploadedFileSize" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_clientId_idx" ON "Report"("clientId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
