ALTER TABLE "ManualAttributedJob"
  ADD COLUMN "cronExpression" TEXT,
  ADD COLUMN "cronEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "cronVariables" JSONB;

CREATE INDEX "ManualAttributedJob_cronEnabled_idx"
  ON "ManualAttributedJob"("cronEnabled");
