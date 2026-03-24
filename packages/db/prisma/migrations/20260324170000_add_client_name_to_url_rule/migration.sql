-- AlterTable
ALTER TABLE "UrlRule"
ADD COLUMN "clientName" TEXT;

-- Indexes
CREATE INDEX "UrlRule_clientName_idx" ON "UrlRule"("clientName");
