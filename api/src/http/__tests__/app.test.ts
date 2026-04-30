import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";

type AppRequest = Request & { params?: Record<string, string> };
type HandlerMode = "ok" | "throw" | "invalid";

const handlerModes = new Map<string, HandlerMode>();
const handlerRegistry = new Map<string, ReturnType<typeof mock>>();

function makeHandler(action: string) {
  const handler = mock(async (req: Request) => {
    const mode = handlerModes.get(action) || "ok";
    if (mode === "throw") {
      throw new Error(`forced error for ${action}`);
    }
    if (mode === "invalid") {
      return { action } as unknown as Response;
    }

    const request = req as AppRequest;
    const hasJsonBody =
      req.method !== "GET" &&
      req.headers.get("content-type")?.includes("application/json");
    const body = hasJsonBody ? await req.json().catch(() => undefined) : undefined;

    return Response.json({
      action,
      params: request.params || {},
      body,
    });
  });

  handlerRegistry.set(action, handler);
  return handler;
}

const mockedControllers = {
  healthController: {
    check: makeHandler("health.check"),
  },
  mcpController: {
    remote: makeHandler("mcp.remote"),
  },
  nonAttributedReportsController: {
    list: makeHandler("nonAttributedReports.list"),
    create: makeHandler("nonAttributedReports.create"),
    updateStatus: makeHandler("nonAttributedReports.updateStatus"),
    rerun: makeHandler("nonAttributedReports.rerun"),
    delete: makeHandler("nonAttributedReports.delete"),
    listLogs: makeHandler("nonAttributedReports.listLogs"),
    detail: makeHandler("nonAttributedReports.detail"),
  },
  reportsController: {
    list: makeHandler("reports.list"),
    create: makeHandler("reports.create"),
    updateStatus: makeHandler("reports.updateStatus"),
    rerun: makeHandler("reports.rerun"),
    delete: makeHandler("reports.delete"),
    listLogs: makeHandler("reports.listLogs"),
    detail: makeHandler("reports.detail"),
    downloadUids: makeHandler("reports.downloadUids"),
    getExportFields: makeHandler("reports.getExportFields"),
    createExportJob: makeHandler("reports.createExportJob"),
    getExportJobStatus: makeHandler("reports.getExportJobStatus"),
    attachRelatedEvents: makeHandler("reports.attachRelatedEvents"),
    generateUserJourney: makeHandler("reports.generateUserJourney"),
    getUserJourneyJobStatus: makeHandler("reports.getUserJourneyJobStatus"),
  },
  urlRulesController: {
    list: makeHandler("urlRules.list"),
    create: makeHandler("urlRules.create"),
    listClients: makeHandler("urlRules.listClients"),
    getById: makeHandler("urlRules.getById"),
    update: makeHandler("urlRules.update"),
    delete: makeHandler("urlRules.delete"),
  },
  usersController: {
    list: makeHandler("users.list"),
    create: makeHandler("users.create"),
    login: makeHandler("users.login"),
    googleLogin: makeHandler("users.googleLogin"),
    getById: makeHandler("users.getById"),
  },
};

const controllersIndexTs = new URL("../../controllers/index.ts", import.meta.url).pathname;
const controllersIndexJs = new URL("../../controllers/index.js", import.meta.url).pathname;
mock.module(controllersIndexTs, () => mockedControllers);
mock.module(controllersIndexJs, () => mockedControllers);

let handleRequest: (req: Request) => Promise<Response>;

beforeAll(async () => {
  ({ handleRequest } = await import("../app.ts"));
});

beforeEach(() => {
  handlerModes.clear();
  mock.clearAllMocks();
});

type RouteCase = {
  method: string;
  path: string;
  action: string;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
};

const routeCases: RouteCase[] = [
  { method: "GET", path: "/api/health", action: "health.check" },
  {
    method: "POST",
    path: "/api/mcp",
    action: "mcp.remote",
    body: { jsonrpc: "2.0", id: 1, method: "ping" },
  },
  { method: "GET", path: "/api/non-attributed-reports", action: "nonAttributedReports.list" },
  {
    method: "POST",
    path: "/api/non-attributed-reports",
    action: "nonAttributedReports.create",
    body: { taskName: "n1" },
  },
  {
    method: "PATCH",
    path: "/api/non-attributed-reports/rpt1/status",
    action: "nonAttributedReports.updateStatus",
    params: { id: "rpt1" },
    body: { status: "Running" },
  },
  {
    method: "POST",
    path: "/api/non-attributed-reports/rpt1/rerun",
    action: "nonAttributedReports.rerun",
    params: { id: "rpt1" },
    body: {},
  },
  {
    method: "DELETE",
    path: "/api/non-attributed-reports/rpt1",
    action: "nonAttributedReports.delete",
    params: { id: "rpt1" },
  },
  {
    method: "GET",
    path: "/api/non-attributed-reports/rpt1/logs",
    action: "nonAttributedReports.listLogs",
    params: { id: "rpt1" },
  },
  {
    method: "GET",
    path: "/api/non-attributed-reports/rpt1/detail",
    action: "nonAttributedReports.detail",
    params: { id: "rpt1" },
  },
  { method: "GET", path: "/api/reports", action: "reports.list" },
  {
    method: "POST",
    path: "/api/reports",
    action: "reports.create",
    body: { taskName: "r1" },
  },
  {
    method: "PATCH",
    path: "/api/reports/rpt1/status",
    action: "reports.updateStatus",
    params: { id: "rpt1" },
    body: { status: "Running" },
  },
  {
    method: "POST",
    path: "/api/reports/rpt1/rerun",
    action: "reports.rerun",
    params: { id: "rpt1" },
    body: {},
  },
  { method: "DELETE", path: "/api/reports/rpt1", action: "reports.delete", params: { id: "rpt1" } },
  { method: "GET", path: "/api/reports/rpt1/logs", action: "reports.listLogs", params: { id: "rpt1" } },
  { method: "GET", path: "/api/reports/rpt1/detail", action: "reports.detail", params: { id: "rpt1" } },
  {
    method: "GET",
    path: "/api/reports/rpt1/uid-download",
    action: "reports.downloadUids",
    params: { id: "rpt1" },
  },
  {
    method: "GET",
    path: "/api/reports/rpt1/exports/fields",
    action: "reports.getExportFields",
    params: { id: "rpt1" },
  },
  {
    method: "POST",
    path: "/api/reports/rpt1/exports",
    action: "reports.createExportJob",
    params: { id: "rpt1" },
    body: { selectedFields: ["id", "uid"] },
  },
  {
    method: "GET",
    path: "/api/reports/rpt1/exports/jobs/job1",
    action: "reports.getExportJobStatus",
    params: { id: "rpt1", jobId: "job1" },
  },
  {
    method: "POST",
    path: "/api/reports/rpt1/attach-related-events",
    action: "reports.attachRelatedEvents",
    params: { id: "rpt1" },
    body: { fileContent: "a,b\n1,2" },
  },
  {
    method: "POST",
    path: "/api/reports/rpt1/referrer-raws/raw1/user-journey/generate",
    action: "reports.generateUserJourney",
    params: { id: "rpt1", rawId: "raw1" },
    body: {},
  },
  {
    method: "GET",
    path: "/api/reports/rpt1/referrer-raws/raw1/user-journey/jobs/job1",
    action: "reports.getUserJourneyJobStatus",
    params: { id: "rpt1", rawId: "raw1", jobId: "job1" },
  },
  { method: "GET", path: "/api/url-rules", action: "urlRules.list" },
  { method: "POST", path: "/api/url-rules", action: "urlRules.create", body: { name: "rule1" } },
  { method: "GET", path: "/api/url-rules/clients", action: "urlRules.listClients" },
  { method: "GET", path: "/api/url-rules/rl1", action: "urlRules.getById", params: { id: "rl1" } },
  {
    method: "PUT",
    path: "/api/url-rules/rl1",
    action: "urlRules.update",
    params: { id: "rl1" },
    body: { name: "rule2" },
  },
  { method: "DELETE", path: "/api/url-rules/rl1", action: "urlRules.delete", params: { id: "rl1" } },
  { method: "GET", path: "/api/users", action: "users.list" },
  { method: "POST", path: "/api/users", action: "users.create", body: { email: "x@y.com" } },
  { method: "POST", path: "/api/users/login", action: "users.login", body: { email: "x@y.com" } },
  { method: "POST", path: "/api/users/google-login", action: "users.googleLogin", body: { credential: "token" } },
  { method: "GET", path: "/api/users/a%20b", action: "users.getById", params: { id: "a b" } },
];

describe("handleRequest route coverage", () => {
  for (const routeCase of routeCases) {
    it(`${routeCase.method} ${routeCase.path}`, async () => {
      const headers = new Headers({ origin: "https://client.example" });
      const init: RequestInit = { method: routeCase.method, headers };

      if (routeCase.body) {
        headers.set("content-type", "application/json");
        init.body = JSON.stringify(routeCase.body);
      }

      const req = new Request(`http://localhost:3000${routeCase.path}`, init);
      const response = await handleRequest(req);

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://client.example");

      const payload = (await response.json()) as {
        action: string;
        params: Record<string, string>;
        body?: unknown;
      };
      expect(payload.action).toBe(routeCase.action);
      expect(payload.params).toEqual(routeCase.params || {});
      if (routeCase.body) {
        expect(payload.body).toEqual(routeCase.body);
      } else {
        expect(payload.body).toBeUndefined();
      }

      expect(handlerRegistry.get(routeCase.action)).toHaveBeenCalledTimes(1);
    });
  }

  it("supports OPTIONS preflight with CORS headers", async () => {
    const request = new Request("http://localhost:3000/api/users", {
      method: "OPTIONS",
      headers: {
        origin: "https://frontend.example",
        "access-control-request-headers": "x-client-id, authorization",
      },
    });

    const response = await handleRequest(request);
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://frontend.example");
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe("x-client-id, authorization");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("GET");
  });

  it("returns 404 for unknown paths", async () => {
    const response = await handleRequest(
      new Request("http://localhost:3000/api/unknown", { method: "GET" }),
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });

  it("returns 405 for unsupported methods", async () => {
    const response = await handleRequest(
      new Request("http://localhost:3000/api/users", { method: "PATCH" }),
    );
    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ error: "Method not allowed" });
  });

  it("returns 500 when handler returns a non-Response value", async () => {
    handlerModes.set("health.check", "invalid");
    const response = await handleRequest(
      new Request("http://localhost:3000/api/health", { method: "GET" }),
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Invalid handler response" });
  });

  it("returns 500 when handler throws", async () => {
    handlerModes.set("health.check", "throw");
    const response = await handleRequest(
      new Request("http://localhost:3000/api/health", { method: "GET" }),
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error" });
  });

  it("normalizes trailing slash paths", async () => {
    const response = await handleRequest(
      new Request("http://localhost:3000/api/health/", { method: "GET" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      action: "health.check",
      params: {},
      body: undefined,
    });
  });
});
