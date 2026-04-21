-- Add per-user bearer token for remote MCP auth
ALTER TABLE "User"
ADD COLUMN "bearerToken" TEXT;

UPDATE "User"
SET "bearerToken" = md5(random()::text || clock_timestamp()::text || id)
WHERE "bearerToken" IS NULL;

ALTER TABLE "User"
ALTER COLUMN "bearerToken" SET NOT NULL;

CREATE UNIQUE INDEX "User_bearerToken_key" ON "User"("bearerToken");
