-- Users table
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "name" TEXT,
  "avatar" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Groups table
CREATE TABLE IF NOT EXISTS "Group" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "department" TEXT,
  "icon" TEXT,
  "logo" TEXT,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "publicAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
  "aiCollaborationEnabled" BOOLEAN NOT NULL DEFAULT true,
  "workspaceVisibility" TEXT NOT NULL DEFAULT 'Members only',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- GroupMember junction table
CREATE TABLE IF NOT EXISTS "GroupMember" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "joinedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE,
  UNIQUE("userId", "groupId")
);

-- GroupInvitation table
CREATE TABLE IF NOT EXISTS "GroupInvitation" (
  "id" TEXT PRIMARY KEY,
  "groupId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "invitedByUserId" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE,
  FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL,
  UNIQUE("groupId", "email")
);

-- Ideas table
CREATE TABLE IF NOT EXISTS "Idea" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "content" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "groupId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE,
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Comments table
CREATE TABLE IF NOT EXISTS "Comment" (
  "id" TEXT PRIMARY KEY,
  "content" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE,
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Goals table
CREATE TABLE IF NOT EXISTS "Goal" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "successMetrics" JSONB,
  "constraints" JSONB,
  "creatorId" TEXT NOT NULL,
  "selectedIdeaId" TEXT,
  "selectedSettingId" TEXT,
  "groupId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE,
  FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("selectedIdeaId") REFERENCES "Idea"("id") ON DELETE SET NULL,
  FOREIGN KEY ("selectedSettingId") REFERENCES "AiEvaluationSetting"("id") ON DELETE SET NULL
);

-- AI evaluation settings table
CREATE TABLE IF NOT EXISTS "AiEvaluationSetting" (
  "id" TEXT PRIMARY KEY,
  "groupId" TEXT NOT NULL,
  "goalId" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "impactWeight" INTEGER NOT NULL,
  "feasibilityWeight" INTEGER NOT NULL,
  "originalityWeight" INTEGER NOT NULL,
  "selectedIdeaIds" JSONB NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE,
  FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE
);

-- AI evaluation results table
CREATE TABLE IF NOT EXISTS "AiEvaluationResult" (
  "id" TEXT PRIMARY KEY,
  "settingId" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "review" TEXT NOT NULL,
  "impactScore" INTEGER NOT NULL,
  "feasibilityScore" INTEGER NOT NULL,
  "originalityScore" INTEGER NOT NULL,
  "totalScore" INTEGER NOT NULL,
  "rank" INTEGER NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("settingId") REFERENCES "AiEvaluationSetting"("id") ON DELETE CASCADE,
  FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE,
  UNIQUE("settingId", "ideaId")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_group_member_user" ON "GroupMember"("userId");
CREATE INDEX IF NOT EXISTS "idx_group_member_group" ON "GroupMember"("groupId");
CREATE INDEX IF NOT EXISTS "idx_group_invitation_email" ON "GroupInvitation"("email");
CREATE INDEX IF NOT EXISTS "idx_idea_group" ON "Idea"("groupId");
CREATE INDEX IF NOT EXISTS "idx_idea_author" ON "Idea"("authorId");
CREATE INDEX IF NOT EXISTS "idx_comment_idea_created_at" ON "Comment"("ideaId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_comment_author" ON "Comment"("authorId");
CREATE INDEX IF NOT EXISTS "idx_goal_group" ON "Goal"("groupId");
CREATE INDEX IF NOT EXISTS "idx_goal_creator" ON "Goal"("creatorId");
CREATE INDEX IF NOT EXISTS "idx_goal_selected_idea" ON "Goal"("selectedIdeaId");
CREATE INDEX IF NOT EXISTS "idx_goal_selected_setting" ON "Goal"("selectedSettingId");
CREATE INDEX IF NOT EXISTS "idx_ai_eval_setting_group_created_at" ON "AiEvaluationSetting"("groupId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_ai_eval_setting_goal" ON "AiEvaluationSetting"("goalId");
CREATE INDEX IF NOT EXISTS "idx_ai_eval_result_setting_rank" ON "AiEvaluationResult"("settingId", "rank");

-- Mood table
CREATE TABLE IF NOT EXISTS "Mood" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "emotion" TEXT,
    "notes" TEXT,
    "recordedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Mood indexes
CREATE INDEX IF NOT EXISTS "idx_mood_user_recorded_at" ON "Mood"("userId", "recordedAt");
CREATE INDEX IF NOT EXISTS "idx_mood_user" ON "Mood"("userId");
