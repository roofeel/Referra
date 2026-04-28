-- Users table
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "name" TEXT,
  "avatar" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Client table
CREATE TABLE IF NOT EXISTS "Client" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Client indexes
CREATE INDEX IF NOT EXISTS "idx_client_name" ON "Client"("name");

-- UrlRule table
CREATE TABLE IF NOT EXISTS "UrlRule" (
  "id" TEXT PRIMARY KEY,
  "clientId" TEXT,
  "name" TEXT NOT NULL,
  "shortName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "logicSource" TEXT NOT NULL DEFAULT '',
  "activeVersion" TEXT NOT NULL DEFAULT 'v1.0.0',
  "updatedBy" TEXT DEFAULT 'System',
  "environmentVariables" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- UrlRule indexes
CREATE INDEX IF NOT EXISTS "idx_url_rule_status" ON "UrlRule"("status");
CREATE INDEX IF NOT EXISTS "idx_url_rule_updated_at" ON "UrlRule"("updatedAt");
CREATE INDEX IF NOT EXISTS "idx_url_rule_name" ON "UrlRule"("name");
CREATE INDEX IF NOT EXISTS "idx_url_rule_client_id" ON "UrlRule"("clientId");
