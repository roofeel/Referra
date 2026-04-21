import { reports, users } from "../../../packages/db/index.js";

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
};

type McpTool = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
};

const MCP_TOOL_NAME = "category_attributed_list";
const MCP_PROTOCOL_VERSION = "2024-11-05";

const mcpTools: McpTool[] = [
  {
    name: MCP_TOOL_NAME,
    description: "Query Category Attributed report task list.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Optional report task status filter, e.g. Running / Completed / Failed / Paused.",
        },
        client: {
          type: "string",
          description: "Optional client name filter.",
        },
        search: {
          type: "string",
          description: "Optional keyword filter for task name, rule id, report id, and client name.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 200,
          description: "Max returned rows. Default 50.",
        },
      },
      additionalProperties: false,
    },
  },
];

function toJsonRpcResult(id: JsonRpcId | undefined, result: unknown) {
  return Response.json({
    jsonrpc: "2.0",
    id: id ?? null,
    result,
  });
}

function toJsonRpcError(id: JsonRpcId | undefined, code: number, message: string, data?: unknown) {
  return Response.json(
    {
      jsonrpc: "2.0",
      id: id ?? null,
      error: {
        code,
        message,
        data,
      },
    },
    { status: 400 },
  );
}

function readBearerToken(req: Request) {
  const header = req.headers.get("authorization")?.trim();
  if (!header) return "";

  const [scheme, token] = header.split(/\s+/, 2);
  if (!scheme || !token) return "";
  if (scheme.toLowerCase() !== "bearer") return "";

  return token.trim();
}

async function authenticate(req: Request) {
  const token = readBearerToken(req);
  if (!token) return null;

  return await users.findByBearerToken(token);
}

function normalizeToolArgs(raw: unknown) {
  const value = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const status = typeof value.status === "string" ? value.status.trim() : "";
  const client = typeof value.client === "string" ? value.client.trim() : "";
  const search = typeof value.search === "string" ? value.search.trim() : "";
  const limitRaw = Number(value.limit);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(200, Math.floor(limitRaw)) : 50;

  return {
    status,
    client,
    search,
    limit,
  };
}

async function callCategoryAttributedListTool(args: unknown) {
  const normalized = normalizeToolArgs(args);
  const items = await reports.list({
    status: normalized.status || undefined,
    client: normalized.client || undefined,
    search: normalized.search || undefined,
  });

  const rows = (items as Array<any>).slice(0, normalized.limit).map((item) => ({
    id: String(item.id),
    taskName: String(item.taskName || ""),
    client: String(item.client?.name || ""),
    status: String(item.status || ""),
    progress: Number(item.progress || 0),
    progressLabel: String(item.progressLabel || ""),
    attribution: String(item.attribution || ""),
    ruleId: String(item.ruleId || ""),
    reportType: String(item.reportType || ""),
    source: String(item.source || ""),
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : String(item.createdAt || ""),
  }));

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(rows, null, 2),
      },
    ],
    structuredContent: {
      items: rows,
      total: rows.length,
      filters: {
        status: normalized.status || null,
        client: normalized.client || null,
        search: normalized.search || null,
        limit: normalized.limit,
      },
    },
  };
}

export const mcpController = {
  async remote(req: Request) {
    const user = await authenticate(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload: JsonRpcRequest;

    try {
      payload = (await req.json()) as JsonRpcRequest;
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!payload || payload.jsonrpc !== "2.0" || typeof payload.method !== "string") {
      return toJsonRpcError(payload?.id, -32600, "Invalid Request");
    }

    if (payload.method === "initialize") {
      return toJsonRpcResult(payload.id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {
          tools: {
            listChanged: false,
          },
        },
        serverInfo: {
          name: "ai-referrer-remote-mcp",
          version: "0.1.0",
        },
      });
    }

    if (payload.method === "notifications/initialized") {
      return new Response(null, { status: 204 });
    }

    if (payload.method === "ping") {
      return toJsonRpcResult(payload.id, {});
    }

    if (payload.method === "tools/list") {
      return toJsonRpcResult(payload.id, {
        tools: mcpTools,
      });
    }

    if (payload.method === "tools/call") {
      const params = (payload.params || {}) as {
        name?: unknown;
        arguments?: unknown;
      };
      const toolName = typeof params.name === "string" ? params.name.trim() : "";

      if (toolName !== MCP_TOOL_NAME) {
        return toJsonRpcError(payload.id, -32601, `Unknown tool: ${toolName || "(empty)"}`);
      }

      const result = await callCategoryAttributedListTool(params.arguments);
      return toJsonRpcResult(payload.id, result);
    }

    return toJsonRpcError(payload.id, -32601, `Method not found: ${payload.method}`);
  },
};
