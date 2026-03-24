import { db, generateId } from "./client.js";

export interface User {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: string;
  name: string;
  department?: string | null;
  icon?: string | null;
  logo?: string | null;
  description?: string | null;
  status: string;
  publicAccessEnabled: boolean;
  aiCollaborationEnabled: boolean;
  workspaceVisibility: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupSettings {
  publicAccessEnabled: boolean;
  aiCollaborationEnabled: boolean;
  workspaceVisibility: string;
}

export interface GroupMember {
  id: string;
  userId: string;
  groupId: string;
  role: string;
  joinedAt: Date;
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  email: string;
  invitedByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Idea {
  id: string;
  title: string;
  content?: string | null;
  status: string;
  groupId: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  content: string;
  ideaId: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  successMetrics?: unknown;
  constraints?: unknown;
  creatorId: string;
  selectedIdeaId?: string | null;
  selectedSettingId?: string | null;
  groupId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AiEvaluationSetting {
  id: string;
  groupId: string;
  goalId: string;
  model: string;
  impactWeight: number;
  feasibilityWeight: number;
  originalityWeight: number;
  selectedIdeaIds: string[];
  createdAt: Date;
}

export interface AiEvaluationResult {
  id: string;
  settingId: string;
  ideaId: string;
  review: string;
  impactScore: number;
  feasibilityScore: number;
  originalityScore: number;
  totalScore: number;
  rank: number;
  createdAt: Date;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

// Helper function to convert mood string to numeric value
function getMoodValue(mood: string): number {
  const moodMap: Record<string, number> = {
    awesome: 5,
    good: 4,
    neutral: 3,
    low: 2,
    poor: 1,
    joyful: 5,
    calm: 4,
    anxious: 2,
    stressed: 1,
    excited: 5,
    tired: 2,
    grateful: 4,
    frustrated: 1,
  };
  return moodMap[mood.toLowerCase()] || 3;
}

// Team mood trend type
interface TeamMoodTrend {
  date: string;
  averageMood: number;
  entries: number;
}

export const users = {
  async create(data: { email: string; name?: string; avatar?: string }) {
    return await db.user.create({
      data: {
        email: data.email,
        name: data.name,
        avatar: data.avatar,
      },
    });
  },

  async findById(id: string) {
    return await db.user.findUnique({
      where: { id },
    });
  },

  async findByEmail(email: string) {
    return await db.user.findUnique({
      where: { email },
    });
  },

  async list() {
    return await db.user.findMany({
      orderBy: { createdAt: "desc" },
    });
  },
};

export const groups = {
  async create(data: {
    name: string;
    department?: string;
    icon?: string;
    logo?: string;
    description?: string;
    creatorUserId?: string;
  }) {
    return await db.$transaction(async (tx: any) => {
      const group = await tx.group.create({
        data: {
          name: data.name,
          department: data.department,
          icon: data.icon,
          logo: data.logo,
          description: data.description,
          status: "active",
        },
      });

      if (data.creatorUserId) {
        await tx.groupMember.upsert({
          where: {
            userId_groupId: {
              userId: data.creatorUserId,
              groupId: group.id,
            },
          },
          update: {
            role: "admin",
          },
          create: {
            userId: data.creatorUserId,
            groupId: group.id,
            role: "admin",
          },
        });
      }

      return group;
    });
  },

  async findById(id: string) {
    return await db.group.findUnique({
      where: { id },
    });
  },

  async list() {
    return await db.group.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  async listWithStats() {
    const groups = await db.group.findMany({
      include: {
        _count: {
          select: {
            members: true,
            ideas: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return groups.map((group: any) => ({
      ...group,
      memberCount: group._count.members,
      ideaCount: group._count.ideas,
      _count: undefined,
    }));
  },

  async update(id: string, data: Partial<Group>) {
    const updateData: any = { ...data };
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    return await db.group.update({
      where: { id },
      data: updateData,
    });
  },

  async delete(id: string) {
    await db.group.delete({
      where: { id },
    });
  },

  async getSettings(groupId: string): Promise<GroupSettings | null> {
    const group = await db.group.findUnique({
      where: { id: groupId },
      select: {
        publicAccessEnabled: true,
        aiCollaborationEnabled: true,
        workspaceVisibility: true,
      },
    });

    if (!group) return null;
    return group;
  },

  async updateSettings(groupId: string, data: GroupSettings): Promise<GroupSettings | null> {
    const updated = await db.group.update({
      where: { id: groupId },
      data: {
        publicAccessEnabled: data.publicAccessEnabled,
        aiCollaborationEnabled: data.aiCollaborationEnabled,
        workspaceVisibility: data.workspaceVisibility,
      },
      select: {
        publicAccessEnabled: true,
        aiCollaborationEnabled: true,
        workspaceVisibility: true,
      },
    });

    return updated;
  },
};

export const groupMembers = {
  async add(data: { userId: string; groupId: string; role?: string }) {
    return await db.groupMember.upsert({
      where: {
        userId_groupId: {
          userId: data.userId,
          groupId: data.groupId,
        },
      },
      update: {
        role: data.role || "member",
      },
      create: {
        userId: data.userId,
        groupId: data.groupId,
        role: data.role || "member",
      },
    });
  },

  async remove(userId: string, groupId: string) {
    await db.groupMember.deleteMany({
      where: {
        userId,
        groupId,
      },
    });
  },

  async listByGroup(groupId: string) {
    return await db.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
  },

  async listByUser(userId: string) {
    return await db.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            department: true,
            icon: true,
            logo: true,
            status: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });
  },

  async findFirst(options: { where: { userId: string }; with?: { group?: boolean } }) {
    const include: any = {};
    if (options.with?.group) {
      include.group = true;
    }

    return await db.groupMember.findFirst({
      where: options.where,
      include,
    });
  },
};

export const groupInvitations = {
  async createOrRefresh(data: { groupId: string; email: string; invitedByUserId?: string }) {
    const id = generateId();
    const normalizedEmail = normalizeEmail(data.email);

    await db.$executeRaw`
      INSERT INTO "GroupInvitation" ("id", "groupId", "email", "invitedByUserId", "createdAt", "updatedAt")
      VALUES (${id}, ${data.groupId}, ${normalizedEmail}, ${data.invitedByUserId || null}, NOW(), NOW())
      ON CONFLICT ("groupId", "email")
      DO UPDATE SET
        "invitedByUserId" = EXCLUDED."invitedByUserId",
        "updatedAt" = NOW()
    `;

    const rows = await db.$queryRaw<Array<GroupInvitation>>`
      SELECT "id", "groupId", "email", "invitedByUserId", "createdAt", "updatedAt"
      FROM "GroupInvitation"
      WHERE "groupId" = ${data.groupId} AND "email" = ${normalizedEmail}
      LIMIT 1
    `;

    return rows[0] || null;
  },

  async listByGroup(groupId: string) {
    return await db.$queryRaw<Array<GroupInvitation>>`
      SELECT "id", "groupId", "email", "invitedByUserId", "createdAt", "updatedAt"
      FROM "GroupInvitation"
      WHERE "groupId" = ${groupId}
      ORDER BY "updatedAt" DESC
    `;
  },

  async consumeByEmail(data: { email: string; userId: string }) {
    const normalizedEmail = normalizeEmail(data.email);
    const invitations = await db.$queryRaw<Array<{ id: string; groupId: string }>>`
      SELECT "id", "groupId"
      FROM "GroupInvitation"
      WHERE "email" = ${normalizedEmail}
    `;

    const joinedGroupIds: string[] = [];
    for (const invitation of invitations) {
      await groupMembers.add({
        userId: data.userId,
        groupId: invitation.groupId,
      });
      joinedGroupIds.push(invitation.groupId);
    }

    if (invitations.length > 0) {
      await db.$executeRaw`
        DELETE FROM "GroupInvitation"
        WHERE "email" = ${normalizedEmail}
      `;
    }

    return {
      joinedGroupIds: Array.from(new Set(joinedGroupIds)),
      consumedCount: invitations.length,
    };
  },

  async removeByGroupAndEmail(groupId: string, email: string) {
    const normalizedEmail = normalizeEmail(email);
    await db.$executeRaw`
      DELETE FROM "GroupInvitation"
      WHERE "groupId" = ${groupId} AND "email" = ${normalizedEmail}
    `;
  },
};

export const ideas = {
  async create(data: {
    title: string;
    content?: string;
    groupId: string;
    authorId: string;
  }) {
    return await db.idea.create({
      data: {
        title: data.title,
        content: data.content,
        groupId: data.groupId,
        authorId: data.authorId,
        status: "pending",
      },
    });
  },

  async findById(id: string) {
    return await db.idea.findUnique({
      where: { id },
    });
  },

  async listByGroup(groupId: string) {
    const rows = await (db.idea as any).findMany({
      where: { groupId },
      include: {
        author: {
          select: {
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((item: any) => ({
      ...item,
      commentCount: item._count.comments,
      _count: undefined,
    }));
  },

  async update(id: string, data: Partial<Idea>) {
    const updateData: any = { ...data };
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.groupId;
    delete updateData.authorId;

    return await db.idea.update({
      where: { id },
      data: updateData,
    });
  },

  async delete(id: string) {
    await db.idea.delete({
      where: { id },
    });
  },
};

export const comments = {
  async create(data: { content: string; ideaId: string; authorId: string }) {
    return await (db as any).comment.create({
      data: {
        content: data.content,
        ideaId: data.ideaId,
        authorId: data.authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
  },

  async listByIdea(ideaId: string) {
    return await (db as any).comment.findMany({
      where: { ideaId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  async findById(id: string) {
    return await (db as any).comment.findUnique({
      where: { id },
    });
  },

  async update(id: string, data: { content: string }) {
    return await (db as any).comment.update({
      where: { id },
      data: {
        content: data.content,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
  },

  async delete(id: string) {
    await (db as any).comment.delete({
      where: { id },
    });
  },
};

export const goals = {
  async create(data: {
    title: string;
    description?: string;
    status?: string;
    successMetrics?: unknown;
    constraints?: unknown;
    creatorId: string;
    selectedIdeaId?: string | null;
    selectedSettingId?: string | null;
    groupId: string;
  }) {
    return await db.goal.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status || "draft",
        successMetrics: data.successMetrics as any,
        constraints: data.constraints as any,
        creatorId: data.creatorId,
        selectedIdeaId: data.selectedIdeaId ?? null,
        selectedSettingId: data.selectedSettingId ?? null,
        groupId: data.groupId,
      },
      include: {
        creator: true,
      },
    });
  },

  async findById(id: string) {
    return await db.goal.findUnique({
      where: { id },
      include: {
        creator: true,
      },
    });
  },

  async listByGroup(groupId: string) {
    return await db.goal.findMany({
      where: { groupId },
      include: {
        creator: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async update(id: string, data: Partial<Goal>) {
    const updateData: any = { ...data };
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.groupId;
    delete updateData.creatorId;

    return await db.goal.update({
      where: { id },
      data: updateData,
      include: {
        creator: true,
      },
    });
  },

  async delete(id: string) {
    await db.goal.delete({
      where: { id },
    });
  },
};

export const aiEvaluationSettings = {
  async create(data: {
    groupId: string;
    goalId: string;
    model: string;
    impactWeight: number;
    feasibilityWeight: number;
    originalityWeight: number;
    selectedIdeaIds: string[];
  }) {
    return await db.aiEvaluationSetting.create({
      data: {
        groupId: data.groupId,
        goalId: data.goalId,
        model: data.model,
        impactWeight: data.impactWeight,
        feasibilityWeight: data.feasibilityWeight,
        originalityWeight: data.originalityWeight,
        selectedIdeaIds: data.selectedIdeaIds,
      },
    });
  },

  async findById(id: string) {
    return await db.aiEvaluationSetting.findUnique({
      where: { id },
    });
  },

  async listByGroup(groupId: string) {
    return await db.aiEvaluationSetting.findMany({
      where: { groupId },
      orderBy: { createdAt: "desc" },
    });
  },
};

export const aiEvaluationResults = {
  async createMany(
    data: Array<{
      settingId: string;
      ideaId: string;
      review: string;
      impactScore: number;
      feasibilityScore: number;
      originalityScore: number;
      totalScore: number;
      rank: number;
    }>,
  ) {
    if (data.length === 0) return { count: 0 };

    return await db.aiEvaluationResult.createMany({
      data: data.map((item) => ({
        settingId: item.settingId,
        ideaId: item.ideaId,
        review: item.review,
        impactScore: item.impactScore,
        feasibilityScore: item.feasibilityScore,
        originalityScore: item.originalityScore,
        totalScore: item.totalScore,
        rank: item.rank,
      })),
      skipDuplicates: true,
    });
  },

  async listBySetting(settingId: string) {
    return await db.aiEvaluationResult.findMany({
      where: { settingId },
      include: {
        idea: {
          select: {
            id: true,
            title: true,
            content: true,
            author: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ rank: "asc" }, { totalScore: "desc" }],
    });
  },
};

export interface Mood {
  id: string;
  userId: string;
  mood: string;
  emotion?: string | null;
  notes?: string | null;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  // 情绪光谱系统 Emotion Spectrum System
  spectrum?: string | null;  // stress, boredom, anxiety, anger, joy, achievement, warmth, calm
  color?: string | null;     // hex color code
  icon?: string | null;      // icon name
  intensity?: number | null;   // 1-10 intensity level
}

export const moods = {
  async create(data: {
    userId: string;
    mood: string;
    emotion?: string;
    notes?: string;
    recordedAt?: Date;
    spectrum?: string;
    color?: string;
    icon?: string;
    intensity?: number;
  }) {
    return await (db as any).mood.create({
      data: {
        userId: data.userId,
        mood: data.mood,
        emotion: data.emotion,
        notes: data.notes,
        recordedAt: data.recordedAt || new Date(),
        spectrum: data.spectrum,
        color: data.color,
        icon: data.icon,
        intensity: data.intensity,
      },
    });
  },

  async findById(id: string) {
    return await (db as any).mood.findUnique({
      where: { id },
    });
  },

  async listByUser(userId: string, options?: { startDate?: Date; endDate?: Date }) {
    const where: any = { userId };

    if (options?.startDate || options?.endDate) {
      where.recordedAt = {};
      if (options.startDate) {
        where.recordedAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.recordedAt.lte = options.endDate;
      }
    }

    return await (db as any).mood.findMany({
      where,
      orderBy: { recordedAt: "desc" },
    });
  },

  async listByGroup(groupId: string, options?: { startDate?: Date; endDate?: Date }) {
    const groupMembers = await (db as any).groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });

    const memberIds = groupMembers.map((m: any) => m.userId);
    if (memberIds.length === 0) {
      return [];
    }

    const where: any = {
      userId: { in: memberIds },
    };

    if (options?.startDate || options?.endDate) {
      where.recordedAt = {};
      if (options.startDate) {
        where.recordedAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.recordedAt.lte = options.endDate;
      }
    }

    return await (db as any).mood.findMany({
      where,
      orderBy: { recordedAt: "desc" },
    });
  },

  async update(id: string, data: Partial<Mood>) {
    const updateData: any = { ...data };
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.userId;

    return await (db as any).mood.update({
      where: { id },
      data: updateData,
    });
  },

  async delete(id: string) {
    await (db as any).mood.delete({
      where: { id },
    });
  },

  async getStatsByUser(userId: string) {
    const entries = await (db as any).mood.findMany({
      where: { userId },
      orderBy: { recordedAt: "desc" },
    });

    const total = entries.length;
    if (total === 0) {
      return {
        total: 0,
        moodCounts: {},
        emotionCounts: {},
        streakDays: 0,
        mostFrequentMood: null,
      };
    }

    const moodCounts: Record<string, number> = {};
    const emotionCounts: Record<string, number> = {};

    for (const entry of entries) {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
      if (entry.emotion) {
        emotionCounts[entry.emotion] = (emotionCounts[entry.emotion] || 0) + 1;
      }
    }

    const mostFrequentMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0][0];

    // Calculate streak (consecutive days with entries)
    let streakDays = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const datesWithEntries = new Set(
      entries.map((e: any) => {
        const d = new Date(e.recordedAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      if (datesWithEntries.has(checkDate.getTime())) {
        if (i === streakDays) {
          streakDays++;
        }
      } else if (i === 0) {
        // If no entry today, still count streak from yesterday
        continue;
      } else {
        break;
      }
    }

    return {
      total,
      moodCounts,
      emotionCounts,
      streakDays,
      mostFrequentMood,
    };
  },


};
