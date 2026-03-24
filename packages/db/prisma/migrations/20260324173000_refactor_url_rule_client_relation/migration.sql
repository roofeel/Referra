-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_name_key" ON "Client"("name");

-- AlterTable
ALTER TABLE "UrlRule"
ADD COLUMN "clientId" TEXT;

-- Data migration from legacy UrlRule.clientName to Client + UrlRule.clientId
INSERT INTO "Client" ("id", "name", "createdAt", "updatedAt")
SELECT
  'cli_' || substr(md5(TRIM("clientName")), 1, 24),
  TRIM("clientName"),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "UrlRule"
WHERE "clientName" IS NOT NULL
  AND TRIM("clientName") <> ''
GROUP BY TRIM("clientName")
ON CONFLICT ("name") DO NOTHING;

UPDATE "UrlRule" ur
SET "clientId" = c."id"
FROM "Client" c
WHERE ur."clientName" IS NOT NULL
  AND TRIM(ur."clientName") = c."name";

-- Drop old index and column
DROP INDEX IF EXISTS "UrlRule_clientName_idx";
ALTER TABLE "UrlRule" DROP COLUMN IF EXISTS "clientName";

-- CreateIndex
CREATE INDEX "UrlRule_clientId_idx" ON "UrlRule"("clientId");

-- AddForeignKey
ALTER TABLE "UrlRule"
ADD CONSTRAINT "UrlRule_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
