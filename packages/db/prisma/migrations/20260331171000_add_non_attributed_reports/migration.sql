-- Create table for non-attributed report tasks.
CREATE TABLE "NonAttributedReport" (
  "id" TEXT NOT NULL,
  "clientId" TEXT,
  "attributedReportId" TEXT NOT NULL,
  "taskName" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'CSV Import',
  "sourceIcon" TEXT NOT NULL DEFAULT 'description',
  "status" TEXT NOT NULL DEFAULT 'Running',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "progressLabel" TEXT NOT NULL DEFAULT '0% Processed',
  "attribution" TEXT NOT NULL DEFAULT '--',
  "reportType" TEXT NOT NULL DEFAULT 'registration',
  "uidParamName" TEXT NOT NULL DEFAULT 'uid',
  "fieldMappings" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NonAttributedReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NonAttributedRaw" (
  "id" TEXT NOT NULL,
  "nonAttributedReportId" TEXT NOT NULL,
  "referrer_type" TEXT NOT NULL,
  "referrer_desc" TEXT NOT NULL,
  "duration" INTEGER NOT NULL,
  "json" JSONB NOT NULL,

  CONSTRAINT "NonAttributedRaw_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NonAttributedLog" (
  "id" TEXT NOT NULL,
  "nonAttributedReportId" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NonAttributedLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NonAttributedReport_clientId_idx" ON "NonAttributedReport"("clientId");
CREATE INDEX "NonAttributedReport_attributedReportId_idx" ON "NonAttributedReport"("attributedReportId");
CREATE INDEX "NonAttributedReport_status_idx" ON "NonAttributedReport"("status");
CREATE INDEX "NonAttributedReport_createdAt_idx" ON "NonAttributedReport"("createdAt");

CREATE INDEX "NonAttributedRaw_nonAttributedReportId_idx" ON "NonAttributedRaw"("nonAttributedReportId");

CREATE INDEX "NonAttributedLog_nonAttributedReportId_idx" ON "NonAttributedLog"("nonAttributedReportId");
CREATE INDEX "NonAttributedLog_createdAt_idx" ON "NonAttributedLog"("createdAt");

ALTER TABLE "NonAttributedReport"
ADD CONSTRAINT "NonAttributedReport_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NonAttributedReport"
ADD CONSTRAINT "NonAttributedReport_attributedReportId_fkey"
FOREIGN KEY ("attributedReportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NonAttributedRaw"
ADD CONSTRAINT "NonAttributedRaw_nonAttributedReportId_fkey"
FOREIGN KEY ("nonAttributedReportId") REFERENCES "NonAttributedReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NonAttributedLog"
ADD CONSTRAINT "NonAttributedLog_nonAttributedReportId_fkey"
FOREIGN KEY ("nonAttributedReportId") REFERENCES "NonAttributedReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
