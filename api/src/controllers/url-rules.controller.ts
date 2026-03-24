import { clients, urlRules } from "../../../packages/db/index.js";

type RequestWithParams<T extends Record<string, string>> = Request & { params: T };

function normalizeStatus(status?: string) {
  if (!status) return undefined;
  const value = status.trim().toLowerCase();
  if (!value) return undefined;
  if (!["active", "draft", "archived"].includes(value)) return undefined;
  return value;
}

function buildShortName(source: string) {
  const alphanumeric = source
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (alphanumeric.length === 0) {
    return "RULE";
  }

  const initials = alphanumeric.map((part) => part[0]).join("");
  if (initials.length >= 2) {
    return initials.slice(0, 8);
  }

  return alphanumeric.join("").slice(0, 8);
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

  async listClients() {
    const items = await clients.list();
    return Response.json(items);
  },

  async create(req: Request) {
    const body = (await req.json()) as {
      clientId?: string;
      clientName?: string;
      ruleName?: string;
      name?: string;
      shortName?: string;
      status?: string;
      logicSource?: string;
      activeVersion?: string;
      updatedBy?: string;
      environmentVariables?: unknown;
    };

    let resolvedClientId: string | undefined;
    if (body.clientId?.trim()) {
      const existingClient = await clients.findById(body.clientId.trim());
      if (!existingClient) {
        return Response.json({ error: "client not found" }, { status: 400 });
      }
      resolvedClientId = existingClient.id;
    } else if (body.clientName?.trim()) {
      const client = await clients.getOrCreateByName(body.clientName.trim());
      resolvedClientId = client?.id;
    }

    const normalizedName = body.name?.trim() || body.ruleName?.trim();
    const normalizedShortName =
      body.shortName?.trim() ||
      buildShortName(`${body.clientName?.trim() ? `${body.clientName.trim()} ` : ""}${normalizedName || ""}`);

    if (!normalizedName) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    const created = await urlRules.create({
      clientId: resolvedClientId,
      name: normalizedName,
      shortName: normalizedShortName,
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
      clientId?: string;
      clientName?: string;
      ruleName?: string;
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

    const normalizedName = body.name?.trim() || body.ruleName?.trim();
    let resolvedClientId: string | undefined;
    if (body.clientId !== undefined) {
      if (!body.clientId) {
        resolvedClientId = undefined;
      } else {
        const existingClient = await clients.findById(body.clientId.trim());
        if (!existingClient) {
          return Response.json({ error: "client not found" }, { status: 400 });
        }
        resolvedClientId = existingClient.id;
      }
    } else if (body.clientName?.trim()) {
      const client = await clients.getOrCreateByName(body.clientName.trim());
      resolvedClientId = client?.id;
    }

    const updated = await urlRules.update(request.params.id, {
      clientId: body.clientId === undefined && !body.clientName ? undefined : (resolvedClientId ?? null),
      name: normalizedName,
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
