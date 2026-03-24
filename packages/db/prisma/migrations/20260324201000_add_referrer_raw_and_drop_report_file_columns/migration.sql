ALTER TABLE "Report"
  DROP COLUMN IF EXISTS "uploadedFileName",
  DROP COLUMN IF EXISTS "uploadedFilePath",
  DROP COLUMN IF EXISTS "uploadedFileSize";

CREATE TABLE "ReferrerRaw" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "referrer_type" TEXT NOT NULL,
  "referrer_desc" TEXT NOT NULL,
  "duration" INTEGER NOT NULL,
  "json" JSONB NOT NULL,

  CONSTRAINT "ReferrerRaw_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReferrerRaw_reportId_idx" ON "ReferrerRaw"("reportId");

ALTER TABLE "ReferrerRaw"
ADD CONSTRAINT "ReferrerRaw_reportId_fkey"
FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
