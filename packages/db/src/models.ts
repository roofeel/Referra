import { db } from "./client.js";

export interface User {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  bearerToken: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UrlRule {
  id: string;
  clientId?: string | null;
  client?: Pick<Client, "id" | "name"> | null;
  name: string;
  shortName: string;
  status: string;
  logicSource: string;
  activeVersion: string;
  updatedBy?: string | null;
  environmentVariables?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface Report {
  id: string;
  clientId?: string | null;
  client?: Pick<Client, "id" | "name"> | null;
  taskName: string;
  ruleId: string;
  source: string;
  sourceIcon: string;
  status: string;
  progress: number;
  progressLabel: string;
  attribution: string;
  reportType: string;
  fieldMappings: unknown;
  relatedEventFieldMappings?: unknown | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NonAttributedReport {
  id: string;
  clientId?: string | null;
  client?: Pick<Client, "id" | "name"> | null;
  attributedReportId: string;
  attributedReport?: Pick<Report, "id" | "taskName"> | null;
  taskName: string;
  ruleId: string;
  source: string;
  sourceIcon: string;
  status: string;
  progress: number;
  progressLabel: string;
  attribution: string;
  reportType: string;
  uidParamName: string;
  fieldMappings: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReferrerRaw {
  id: string;
  reportId: string;
  referrerType: string;
  referrerDesc: string;
  duration: number;
  uid?: string | null;
  json: unknown;
  journeyLogs?: unknown | null;
  userJourneyDoc?: string | null;
  firstPageLoadDuration?: number | null;
}

export interface NonAttributedRaw {
  id: string;
  nonAttributedReportId: string;
  referrerType: string;
  referrerDesc: string;
  duration: number;
  json: unknown;
}

export interface Log {
  id: string;
  reportId: string;
  level: string;
  message: string;
  createdAt: Date;
}

export interface NonAttributedLog {
  id: string;
  nonAttributedReportId: string;
  level: string;
  message: string;
  createdAt: Date;
}

export const users = {
  async create(data: { email: string; name?: string; avatar?: string; bearerToken?: string }) {
    return await db.user.create({
      data: {
        email: data.email,
        name: data.name,
        avatar: data.avatar,
        bearerToken: data.bearerToken,
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

  async findByBearerToken(bearerToken: string) {
    return await db.user.findUnique({
      where: { bearerToken },
    });
  },

  async updateBearerToken(id: string, bearerToken: string) {
    return await db.user.update({
      where: { id },
      data: { bearerToken },
    });
  },

  async list() {
    return await db.user.findMany({
      orderBy: { createdAt: "desc" },
    });
  },
};

export const clients = {
  async create(data: { name: string }) {
    return await (db as any).client.create({
      data: {
        name: data.name.trim(),
      },
    });
  },

  async findById(id: string) {
    return await (db as any).client.findUnique({
      where: { id },
    });
  },

  async findByName(name: string) {
    return await (db as any).client.findUnique({
      where: { name: name.trim() },
    });
  },

  async getOrCreateByName(name: string) {
    const normalized = name.trim();
    if (!normalized) return null;

    const existing = await (db as any).client.findFirst({
      where: {
        name: {
          equals: normalized,
          mode: "insensitive",
        },
      },
    });

    if (existing) return existing;

    return await (db as any).client.create({
      data: {
        name: normalized,
      },
    });
  },

  async list() {
    return await (db as any).client.findMany({
      orderBy: { name: "asc" },
    });
  },
};

export const urlRules = {
  async create(data: {
    clientId?: string;
    name: string;
    shortName: string;
    status?: string;
    logicSource?: string;
    activeVersion?: string;
    updatedBy?: string;
    environmentVariables?: unknown;
  }) {
    return await (db as any).urlRule.create({
      data: {
        clientId: data.clientId || null,
        name: data.name,
        shortName: data.shortName,
        status: data.status || "active",
        logicSource: data.logicSource || "",
        activeVersion: data.activeVersion || "v1.0.0",
        updatedBy: data.updatedBy || "System",
        environmentVariables: data.environmentVariables,
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });
  },

  async findById(id: string) {
    return await (db as any).urlRule.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });
  },

  async list(options?: { status?: string; search?: string }) {
    const where: any = {};
    if (options?.status) {
      where.status = options.status;
    }
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: "insensitive" } },
        { shortName: { contains: options.search, mode: "insensitive" } },
        {
          client: {
            is: {
              name: { contains: options.search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    return await (db as any).urlRule.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });
  },

  async listClients() {
    return await clients.list();
  },

  async update(id: string, data: Partial<UrlRule>) {
    const updateData: any = { ...data };
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    return await (db as any).urlRule.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });
  },

  async delete(id: string) {
    await (db as any).urlRule.delete({
      where: { id },
    });
  },
};

export const reports = {
  async create(data: {
    clientId?: string;
    taskName: string;
    ruleId: string;
    source?: string;
    sourceIcon?: string;
    status?: string;
    progress?: number;
    progressLabel?: string;
    attribution?: string;
    reportType?: string;
    fieldMappings: unknown;
    relatedEventFieldMappings?: unknown | null;
  }) {
    return await (db as any).report.create({
      data: {
        clientId: data.clientId || null,
        taskName: data.taskName,
        ruleId: data.ruleId,
        source: data.source || "CSV Import",
        sourceIcon: data.sourceIcon || "description",
        status: data.status || "Running",
        progress: data.progress ?? 0,
        progressLabel: data.progressLabel || "0% Processed",
        attribution: data.attribution || "--",
        reportType: data.reportType || "registration",
        fieldMappings: data.fieldMappings,
        relatedEventFieldMappings: data.relatedEventFieldMappings ?? null,
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });
  },

  async findById(id: string) {
    return await (db as any).report.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });
  },

  async list(options?: { status?: string; client?: string; search?: string; startDate?: Date; endDate?: Date }) {
    const where: any = {};
    if (options?.status) {
      where.status = options.status;
    }
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options?.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options?.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }
    if (options?.client) {
      where.client = {
        is: {
          name: {
            equals: options.client,
            mode: "insensitive",
          },
        },
      };
    }
    if (options?.search) {
      const searchFilter = [
        { taskName: { contains: options.search, mode: "insensitive" } },
        { ruleId: { contains: options.search, mode: "insensitive" } },
        { id: { contains: options.search, mode: "insensitive" } },
        { client: { is: { name: { contains: options.search, mode: "insensitive" } } } },
      ];

      if (where.client) {
        where.AND = [{ client: where.client }, { OR: searchFilter }];
        delete where.client;
      } else {
        where.OR = searchFilter;
      }
    }

    return await (db as any).report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });
  },

  async listUpdatedAfter(since: Date) {
    return await (db as any).report.findMany({
      where: {
        updatedAt: {
          gte: since,
        },
      },
      select: { id: true },
    });
  },

  async update(id: string, data: Partial<Report>) {
    const updateData: any = { ...data };
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.client;

    return await (db as any).report.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });
  },

  async delete(id: string) {
    await (db as any).report.delete({
      where: { id },
    });
  },
};

export const nonAttributedReports = {
  async create(data: {
    clientId?: string;
    attributedReportId: string;
    taskName: string;
    ruleId: string;
    source?: string;
    sourceIcon?: string;
    status?: string;
    progress?: number;
    progressLabel?: string;
    attribution?: string;
    reportType?: string;
    uidParamName?: string;
    fieldMappings: unknown;
  }) {
    return await (db as any).nonAttributedReport.create({
      data: {
        clientId: data.clientId || null,
        attributedReportId: data.attributedReportId,
        taskName: data.taskName,
        ruleId: data.ruleId,
        source: data.source || "CSV Import",
        sourceIcon: data.sourceIcon || "description",
        status: data.status || "Running",
        progress: data.progress ?? 0,
        progressLabel: data.progressLabel || "0% Processed",
        attribution: data.attribution || "--",
        reportType: data.reportType || "registration",
        uidParamName: data.uidParamName || "uid",
        fieldMappings: data.fieldMappings,
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
        attributedReport: {
          select: { id: true, taskName: true },
        },
      },
    });
  },

  async findById(id: string) {
    return await (db as any).nonAttributedReport.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true },
        },
        attributedReport: {
          select: { id: true, taskName: true },
        },
      },
    });
  },

  async list(options?: { status?: string; client?: string; search?: string; startDate?: Date; endDate?: Date }) {
    const where: any = {};
    if (options?.status) {
      where.status = options.status;
    }
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options?.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options?.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }
    if (options?.client) {
      where.client = {
        is: {
          name: {
            equals: options.client,
            mode: "insensitive",
          },
        },
      };
    }
    if (options?.search) {
      const searchFilter = [
        { taskName: { contains: options.search, mode: "insensitive" } },
        { ruleId: { contains: options.search, mode: "insensitive" } },
        { id: { contains: options.search, mode: "insensitive" } },
        { client: { is: { name: { contains: options.search, mode: "insensitive" } } } },
        { attributedReport: { is: { taskName: { contains: options.search, mode: "insensitive" } } } },
      ];

      if (where.client) {
        where.AND = [{ client: where.client }, { OR: searchFilter }];
        delete where.client;
      } else {
        where.OR = searchFilter;
      }
    }

    return await (db as any).nonAttributedReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: { id: true, name: true },
        },
        attributedReport: {
          select: { id: true, taskName: true },
        },
      },
    });
  },

  async listUpdatedAfter(since: Date) {
    return await (db as any).nonAttributedReport.findMany({
      where: {
        updatedAt: {
          gte: since,
        },
      },
      select: { id: true },
    });
  },

  async update(id: string, data: Partial<NonAttributedReport>) {
    const updateData: any = { ...data };
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.client;
    delete updateData.attributedReport;

    return await (db as any).nonAttributedReport.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: { id: true, name: true },
        },
        attributedReport: {
          select: { id: true, taskName: true },
        },
      },
    });
  },

  async delete(id: string) {
    await (db as any).nonAttributedReport.delete({
      where: { id },
    });
  },
};

export const referrerRaws = {
  async createMany(data: Array<{
    reportId: string;
    referrerType: string;
    referrerDesc: string;
    duration: number;
    uid?: string | null;
    json: unknown;
    journeyLogs?: unknown | null;
    userJourneyDoc?: string | null;
    firstPageLoadDuration?: number | null;
  }>) {
    if (data.length === 0) {
      return { count: 0 };
    }

    return await (db as any).referrerRaw.createMany({
      data: data.map((item) => ({
        reportId: item.reportId,
        referrerType: item.referrerType,
        referrerDesc: item.referrerDesc,
        duration: item.duration,
        uid: item.uid ?? null,
        json: item.json,
        journeyLogs: item.journeyLogs ?? null,
        userJourneyDoc: item.userJourneyDoc ?? null,
        firstPageLoadDuration: item.firstPageLoadDuration ?? null,
      })),
    });
  },

  async deleteByReport(reportId: string) {
    return await (db as any).referrerRaw.deleteMany({
      where: { reportId },
    });
  },

  async replaceByReport(
    reportId: string,
    data: Array<{
      referrerType: string;
      referrerDesc: string;
      duration: number;
      uid?: string | null;
      json: unknown;
      journeyLogs?: unknown | null;
      userJourneyDoc?: string | null;
      firstPageLoadDuration?: number | null;
    }>,
  ) {
    return await (db as any).$transaction(async (tx: any) => {
      await tx.referrerRaw.deleteMany({
        where: { reportId },
      });

      if (data.length === 0) {
        return { count: 0 };
      }

      return await tx.referrerRaw.createMany({
        data: data.map((item) => ({
          reportId,
          referrerType: item.referrerType,
          referrerDesc: item.referrerDesc,
          duration: item.duration,
          uid: item.uid ?? null,
          json: item.json,
          journeyLogs: item.journeyLogs ?? null,
          userJourneyDoc: item.userJourneyDoc ?? null,
          firstPageLoadDuration: item.firstPageLoadDuration ?? null,
        })),
      });
    });
  },

  async listByReport(
    reportId: string,
    options?: {
      skip?: number;
      take?: number;
    },
  ) {
    return await (db as any).referrerRaw.findMany({
      where: { reportId },
      orderBy: { id: "asc" },
      skip: options?.skip,
      take: options?.take,
    });
  },

  async listByReportAndUid(reportId: string, uid: string) {
    return await (db as any).referrerRaw.findMany({
      where: {
        reportId,
        uid,
      },
      orderBy: { id: "asc" },
    });
  },

  async countByReport(reportId: string) {
    return await (db as any).referrerRaw.count({
      where: { reportId },
    });
  },

  async countByReportGroupedType(reportId: string) {
    return await (db as any).referrerRaw.groupBy({
      by: ['referrerType'],
      where: { reportId },
      _count: {
        _all: true,
      },
    });
  },

  async findByIdInReport(reportId: string, id: string) {
    return await (db as any).referrerRaw.findFirst({
      where: {
        id,
        reportId,
      },
    });
  },

  async updateUserJourneyDoc(params: {
    reportId: string;
    id: string;
    userJourneyDoc: string | null;
  }) {
    await (db as any).referrerRaw.updateMany({
      where: {
        id: params.id,
        reportId: params.reportId,
      },
      data: {
        userJourneyDoc: params.userJourneyDoc,
      },
    });

    return await (db as any).referrerRaw.findFirst({
      where: {
        id: params.id,
        reportId: params.reportId,
      },
    });
  },

  async updateJourneyLogsMany(
    data: Array<{
      id: string;
      journeyLogs: unknown | null;
      firstPageLoadDuration?: number | null;
    }>,
  ) {
    if (data.length === 0) {
      return { count: 0 };
    }

    const CHUNK_SIZE = 200;
    let updatedCount = 0;

    for (let index = 0; index < data.length; index += CHUNK_SIZE) {
      const chunk = data.slice(index, index + CHUNK_SIZE);
      await (db as any).$transaction(
        chunk.map((item) =>
          (db as any).referrerRaw.update({
            where: { id: item.id },
            data: {
              journeyLogs: item.journeyLogs,
              firstPageLoadDuration: item.firstPageLoadDuration ?? null,
            },
          }),
        ),
      );
      updatedCount += chunk.length;
    }

    return { count: updatedCount };
  },
};

export const nonAttributedRaws = {
  async createMany(data: Array<{
    nonAttributedReportId: string;
    referrerType: string;
    referrerDesc: string;
    duration: number;
    json: unknown;
  }>) {
    if (data.length === 0) {
      return { count: 0 };
    }

    return await (db as any).nonAttributedRaw.createMany({
      data: data.map((item) => ({
        nonAttributedReportId: item.nonAttributedReportId,
        referrerType: item.referrerType,
        referrerDesc: item.referrerDesc,
        duration: item.duration,
        json: item.json,
      })),
    });
  },

  async replaceByReport(
    nonAttributedReportId: string,
    data: Array<{
      referrerType: string;
      referrerDesc: string;
      duration: number;
      json: unknown;
    }>,
  ) {
    return await (db as any).$transaction(async (tx: any) => {
      await tx.nonAttributedRaw.deleteMany({
        where: { nonAttributedReportId },
      });

      if (data.length === 0) {
        return { count: 0 };
      }

      return await tx.nonAttributedRaw.createMany({
        data: data.map((item) => ({
          nonAttributedReportId,
          referrerType: item.referrerType,
          referrerDesc: item.referrerDesc,
          duration: item.duration,
          json: item.json,
        })),
      });
    });
  },

  async listByReport(
    nonAttributedReportId: string,
    options?: {
      skip?: number;
      take?: number;
    },
  ) {
    return await (db as any).nonAttributedRaw.findMany({
      where: { nonAttributedReportId },
      orderBy: { id: "asc" },
      skip: options?.skip,
      take: options?.take,
    });
  },

  async countByReport(nonAttributedReportId: string) {
    return await (db as any).nonAttributedRaw.count({
      where: { nonAttributedReportId },
    });
  },

  async countByReportGroupedType(nonAttributedReportId: string) {
    return await (db as any).nonAttributedRaw.groupBy({
      by: ['referrerType'],
      where: { nonAttributedReportId },
      _count: {
        _all: true,
      },
    });
  },
};

export const logs = {
  async createMany(
    data: Array<{
      reportId: string;
      level: string;
      message: string;
    }>,
  ) {
    if (data.length === 0) {
      return { count: 0 };
    }

    return await (db as any).log.createMany({
      data: data.map((item) => ({
        reportId: item.reportId,
        level: item.level,
        message: item.message,
      })),
    });
  },

  async listByReport(reportId: string) {
    return await (db as any).log.findMany({
      where: { reportId },
      orderBy: { createdAt: "asc" },
    });
  },
};

export const nonAttributedLogs = {
  async createMany(
    data: Array<{
      nonAttributedReportId: string;
      level: string;
      message: string;
    }>,
  ) {
    if (data.length === 0) {
      return { count: 0 };
    }

    return await (db as any).nonAttributedLog.createMany({
      data: data.map((item) => ({
        nonAttributedReportId: item.nonAttributedReportId,
        level: item.level,
        message: item.message,
      })),
    });
  },

  async listByReport(nonAttributedReportId: string) {
    return await (db as any).nonAttributedLog.findMany({
      where: { nonAttributedReportId },
      orderBy: { createdAt: "asc" },
    });
  },
};
