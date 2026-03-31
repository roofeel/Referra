-- Add reportType with a safe default for existing and future rows.
ALTER TABLE "Report"
ADD COLUMN "reportType" TEXT NOT NULL DEFAULT 'registration';

-- attributionLogic is no longer persisted; fieldMappings remains the source mapping.
ALTER TABLE "Report"
DROP COLUMN "attributionLogic";
