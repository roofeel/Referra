ALTER TABLE "Report"
ALTER COLUMN "attributionLogic" TYPE JSONB
USING CASE
  WHEN "attributionLogic" IS NULL THEN '{}'::jsonb
  WHEN "attributionLogic" IN ('registration', 'pageload') THEN jsonb_build_object('mode', "attributionLogic")
  ELSE jsonb_build_object('value', "attributionLogic")
END;
