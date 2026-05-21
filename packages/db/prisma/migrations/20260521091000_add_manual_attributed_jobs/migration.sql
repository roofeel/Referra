CREATE TABLE "ManualAttributedJob" (
  "jobId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "startDate" TEXT NOT NULL DEFAULT '',
  "endDate" TEXT NOT NULL DEFAULT '',
  "database" TEXT NOT NULL,
  "workgroup" TEXT NOT NULL,
  "resultS3" TEXT NOT NULL,
  "sqlTemplate" TEXT NOT NULL,
  "renderedSql" TEXT NOT NULL,
  "queryExecutionId" TEXT,
  "downloadUrl" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ManualAttributedJob_pkey" PRIMARY KEY ("jobId")
);

CREATE INDEX "ManualAttributedJob_status_idx" ON "ManualAttributedJob"("status");
CREATE INDEX "ManualAttributedJob_createdAt_idx" ON "ManualAttributedJob"("createdAt");
