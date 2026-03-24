CREATE TABLE "Log" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Log_reportId_idx" ON "Log"("reportId");
CREATE INDEX "Log_createdAt_idx" ON "Log"("createdAt");

ALTER TABLE "Log"
ADD CONSTRAINT "Log_reportId_fkey"
FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
