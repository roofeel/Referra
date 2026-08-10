CREATE TABLE "DeliveryRefreshJob" (
  "jobId" TEXT NOT NULL DEFAULT 'delivery-overview-refresh',
  "name" TEXT NOT NULL DEFAULT 'Delivery Overview refresh',
  "cronExpression" TEXT NOT NULL DEFAULT '0 * * * *',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliveryRefreshJob_pkey" PRIMARY KEY ("jobId")
);

CREATE TABLE "DeliveryRefreshLog" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "rows" INTEGER,
  "error" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliveryRefreshLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeliveryRefreshLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DeliveryRefreshJob"("jobId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "DeliveryRefreshLog_jobId_createdAt_idx" ON "DeliveryRefreshLog"("jobId", "createdAt");
CREATE INDEX "DeliveryRefreshLog_status_createdAt_idx" ON "DeliveryRefreshLog"("status", "createdAt");
