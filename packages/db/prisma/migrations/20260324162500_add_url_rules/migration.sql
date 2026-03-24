-- CreateTable
CREATE TABLE "UrlRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "logicSource" TEXT NOT NULL DEFAULT '',
    "activeVersion" TEXT NOT NULL DEFAULT 'v1.0.0',
    "updatedBy" TEXT DEFAULT 'System',
    "environmentVariables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UrlRule_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "UrlRule_status_idx" ON "UrlRule"("status");
CREATE INDEX "UrlRule_updatedAt_idx" ON "UrlRule"("updatedAt");
CREATE INDEX "UrlRule_name_idx" ON "UrlRule"("name");
