import { athenaTables } from "../../../packages/db/index.js";

type RequestWithParams<T extends Record<string, string>> = Request & { params: T };

function normalizeNonEmptyString(value?: string) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

export const athenaTablesController = {
  async list(req: Request) {
    const url = new URL(req.url);
    const search = normalizeNonEmptyString(url.searchParams.get("search") || undefined);
    const tableType = normalizeNonEmptyString(url.searchParams.get("tableType") || undefined);

    const items = await athenaTables.list({ search, tableType });
    return Response.json(items);
  },

  async getById(req: Request) {
    const request = req as RequestWithParams<{ id: string }>;
    const item = await athenaTables.findById(request.params.id);

    if (!item) {
      return Response.json({ error: "Athena table not found" }, { status: 404 });
    }

    return Response.json(item);
  },

  async create(req: Request) {
    const body = (await req.json()) as {
      tableType?: string;
      tableNamePattern?: string;
      ddl?: string;
      updatedBy?: string;
    };

    const tableType = normalizeNonEmptyString(body.tableType);
    const tableNamePattern = normalizeNonEmptyString(body.tableNamePattern);
    const ddl = typeof body.ddl === "string" ? body.ddl.trim() : "";

    if (!tableType) {
      return Response.json({ error: "tableType is required" }, { status: 400 });
    }
    if (!tableNamePattern) {
      return Response.json({ error: "tableNamePattern is required" }, { status: 400 });
    }
    if (!ddl) {
      return Response.json({ error: "ddl is required" }, { status: 400 });
    }

    const created = await athenaTables.create({
      tableType,
      tableNamePattern,
      ddl,
      updatedBy: normalizeNonEmptyString(body.updatedBy),
    });

    return Response.json(created, { status: 201 });
  },

  async update(req: Request) {
    const request = req as RequestWithParams<{ id: string }>;
    const body = (await req.json()) as {
      tableType?: string;
      tableNamePattern?: string;
      ddl?: string;
      updatedBy?: string;
    };

    const existing = await athenaTables.findById(request.params.id);
    if (!existing) {
      return Response.json({ error: "Athena table not found" }, { status: 404 });
    }

    const updateData: {
      tableType?: string;
      tableNamePattern?: string;
      ddl?: string;
      updatedBy?: string;
    } = {};

    if (body.tableType !== undefined) {
      const tableType = normalizeNonEmptyString(body.tableType);
      if (!tableType) {
        return Response.json({ error: "tableType cannot be empty" }, { status: 400 });
      }
      updateData.tableType = tableType;
    }

    if (body.tableNamePattern !== undefined) {
      const tableNamePattern = normalizeNonEmptyString(body.tableNamePattern);
      if (!tableNamePattern) {
        return Response.json({ error: "tableNamePattern cannot be empty" }, { status: 400 });
      }
      updateData.tableNamePattern = tableNamePattern;
    }

    if (body.ddl !== undefined) {
      const ddl = body.ddl.trim();
      if (!ddl) {
        return Response.json({ error: "ddl cannot be empty" }, { status: 400 });
      }
      updateData.ddl = ddl;
    }

    if (body.updatedBy !== undefined) {
      updateData.updatedBy = normalizeNonEmptyString(body.updatedBy) || "System";
    }

    const updated = await athenaTables.update(request.params.id, updateData);
    return Response.json(updated);
  },

  async delete(req: Request) {
    const request = req as RequestWithParams<{ id: string }>;
    const existing = await athenaTables.findById(request.params.id);

    if (!existing) {
      return Response.json({ error: "Athena table not found" }, { status: 404 });
    }

    await athenaTables.delete(request.params.id);
    return new Response(null, { status: 204 });
  },
};
