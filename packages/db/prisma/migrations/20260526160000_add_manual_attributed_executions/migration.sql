CREATE TABLE "ManualAttributedExecution" (
  "executionId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "renderedSql" TEXT NOT NULL,
  "queryExecutionId" TEXT,
  "resultFilePath" TEXT,
  "downloadUrl" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManualAttributedExecution_pkey" PRIMARY KEY ("executionId")
);

CREATE INDEX "ManualAttributedExecution_jobId_createdAt_idx"
  ON "ManualAttributedExecution"("jobId", "createdAt");

CREATE INDEX "ManualAttributedExecution_status_idx"
  ON "ManualAttributedExecution"("status");

ALTER TABLE "ManualAttributedExecution"
  ADD CONSTRAINT "ManualAttributedExecution_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "ManualAttributedJob"("jobId")
  ON DELETE CASCADE ON UPDATE CASCADE;
