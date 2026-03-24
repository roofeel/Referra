import { urlRules } from "../../../packages/db/index.js";

type RequestWithParams<T extends Record<string, string>> = Request & { params: T };

function normalizeStatus(status?: string) {
  if (!status) return undefined;
  const value = status.trim().toLowerCase();
  if (!value) return undefined;
  if (!["active", "draft", "archived"].includes(value)) return undefined;
  return value;
}

export const urlRulesController = {
  async list(req: Request) {
    const url = new URL(req.url);
    const status = normalizeStatus(url.searchParams.get("status") || undefined);
    const search = url.searchParams.get("search")?.trim() || undefined;

    const items = await urlRules.list({ status, search });
    return Response.json(items);
  },

  async getById(req: Request) {
    const request = req as RequestWithParams<{ id: string }>;
    const item = await urlRules.findById(request.params.id);

    if (!item) {
      return Response.json({ error: "URL rule not found" }, { status: 404 });
    }

    return Response.json(item);
  },

  async create(req: Request) {
    const body = (await req.json()) as {
      name?: string;
      shortName?: string;
      status?: string;
      logicSource?: string;
      activeVersion?: string;
      updatedBy?: string;
      environmentVariables?: unknown;
    };

    if (!body.name?.trim()) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    if (!body.shortName?.trim()) {
      return Response.json({ error: "shortName is required" }, { status: 400 });
    }

    const created = await urlRules.create({
      name: body.name.trim(),
      shortName: body.shortName.trim(),
      status: normalizeStatus(body.status) || "draft",
      logicSource: body.logicSource || "",
      activeVersion: body.activeVersion,
      updatedBy: body.updatedBy,
      environmentVariables: body.environmentVariables,
    });

    return Response.json(created, { status: 201 });
  },

  async update(req: Request) {
    const request = req as RequestWithParams<{ id: string }>;
    const body = (await req.json()) as {
      name?: string;
      shortName?: string;
      status?: string;
      logicSource?: string;
      activeVersion?: string;
      updatedBy?: string;
      environmentVariables?: unknown;
    };

    const existing = await urlRules.findById(request.params.id);
    if (!existing) {
      return Response.json({ error: "URL rule not found" }, { status: 404 });
    }

    const updated = await urlRules.update(request.params.id, {
      name: body.name?.trim(),
      shortName: body.shortName?.trim(),
      status: normalizeStatus(body.status) || undefined,
      logicSource: body.logicSource,
      activeVersion: body.activeVersion,
      updatedBy: body.updatedBy,
      environmentVariables: body.environmentVariables,
    });

    return Response.json(updated);
  },

  async delete(req: Request) {
    const request = req as RequestWithParams<{ id: string }>;
    const existing = await urlRules.findById(request.params.id);

    if (!existing) {
      return Response.json({ error: "URL rule not found" }, { status: 404 });
    }

    await urlRules.delete(request.params.id);
    return new Response(null, { status: 204 });
  },
};
