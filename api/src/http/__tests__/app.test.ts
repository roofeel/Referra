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
  usersController: {
    list: makeHandler("users.list"),
    create: makeHandler("users.create"),
    login: makeHandler("users.login"),
    googleLogin: makeHandler("users.googleLogin"),
    getById: makeHandler("users.getById"),
    getUserGroups: makeHandler("users.getUserGroups"),
  },
  groupsController: {
    list: makeHandler("groups.list"),
    create: makeHandler("groups.create"),
    getById: makeHandler("groups.getById"),
    update: makeHandler("groups.update"),
    delete: makeHandler("groups.delete"),
    getMembers: makeHandler("groups.getMembers"),
    addMember: makeHandler("groups.addMember"),
    listInvitations: makeHandler("groups.listInvitations"),
    inviteByEmail: makeHandler("groups.inviteByEmail"),
    getSettings: makeHandler("groups.getSettings"),
    updateSettings: makeHandler("groups.updateSettings"),
    removeMember: makeHandler("groups.removeMember"),
  },
  ideasController: {
    listByGroup: makeHandler("ideas.listByGroup"),
    create: makeHandler("ideas.create"),
    getById: makeHandler("ideas.getById"),
    update: makeHandler("ideas.update"),
    delete: makeHandler("ideas.delete"),
    listComments: makeHandler("ideas.listComments"),
    createComment: makeHandler("ideas.createComment"),
    updateComment: makeHandler("ideas.updateComment"),
    deleteComment: makeHandler("ideas.deleteComment"),
  },
  goalsController: {
    listByGroup: makeHandler("goals.listByGroup"),
    create: makeHandler("goals.create"),
    getById: makeHandler("goals.getById"),
    update: makeHandler("goals.update"),
    delete: makeHandler("goals.delete"),
  },
  aiEvaluationSettingsController: {
    listByGroup: makeHandler("aiSettings.listByGroup"),
    create: makeHandler("aiSettings.create"),
    getById: makeHandler("aiSettings.getById"),
    listResultsBySetting: makeHandler("aiSettings.listResultsBySetting"),
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
  { method: "GET", path: "/api/users", action: "users.list" },
  { method: "POST", path: "/api/users", action: "users.create", body: { email: "x@y.com" } },
  { method: "POST", path: "/api/users/login", action: "users.login", body: { email: "x@y.com" } },
  {
    method: "POST",
    path: "/api/users/google-login",
    action: "users.googleLogin",
    body: { credential: "token" },
  },
  { method: "GET", path: "/api/users/a%20b", action: "users.getById", params: { id: "a b" } },
  { method: "GET", path: "/api/users/u1/groups", action: "users.getUserGroups", params: { id: "u1" } },
  { method: "GET", path: "/api/groups", action: "groups.list" },
  { method: "POST", path: "/api/groups", action: "groups.create", body: { name: "G" } },
  { method: "GET", path: "/api/groups/g1", action: "groups.getById", params: { id: "g1" } },
  { method: "PUT", path: "/api/groups/g1", action: "groups.update", params: { id: "g1" }, body: { name: "G2" } },
  { method: "DELETE", path: "/api/groups/g1", action: "groups.delete", params: { id: "g1" } },
  { method: "GET", path: "/api/groups/g1/members", action: "groups.getMembers", params: { id: "g1" } },
  {
    method: "POST",
    path: "/api/groups/g1/members",
    action: "groups.addMember",
    params: { id: "g1" },
    body: { userId: "u1" },
  },
  { method: "GET", path: "/api/groups/g1/invitations", action: "groups.listInvitations", params: { id: "g1" } },
  {
    method: "POST",
    path: "/api/groups/g1/invitations",
    action: "groups.inviteByEmail",
    params: { id: "g1" },
    body: { email: "new@example.com" },
  },
  { method: "GET", path: "/api/groups/g1/settings", action: "groups.getSettings", params: { id: "g1" } },
  {
    method: "PUT",
    path: "/api/groups/g1/settings",
    action: "groups.updateSettings",
    params: { id: "g1" },
    body: { publicAccessEnabled: true },
  },
  {
    method: "DELETE",
    path: "/api/groups/g1/members/u1",
    action: "groups.removeMember",
    params: { groupId: "g1", userId: "u1" },
  },
  { method: "GET", path: "/api/groups/g1/ideas", action: "ideas.listByGroup", params: { id: "g1" } },
  {
    method: "POST",
    path: "/api/groups/g1/ideas",
    action: "ideas.create",
    params: { id: "g1" },
    body: { title: "Idea", authorId: "u1" },
  },
  { method: "GET", path: "/api/ideas/i1", action: "ideas.getById", params: { id: "i1" } },
  { method: "PUT", path: "/api/ideas/i1", action: "ideas.update", params: { id: "i1" }, body: { title: "new" } },
  { method: "DELETE", path: "/api/ideas/i1", action: "ideas.delete", params: { id: "i1" } },
  { method: "GET", path: "/api/ideas/i1/comments", action: "ideas.listComments", params: { id: "i1" } },
  {
    method: "POST",
    path: "/api/ideas/i1/comments",
    action: "ideas.createComment",
    params: { id: "i1" },
    body: { content: "c1", authorId: "u1" },
  },
  {
    method: "PUT",
    path: "/api/comments/c1",
    action: "ideas.updateComment",
    params: { id: "c1" },
    body: { content: "c2", authorId: "u1" },
  },
  {
    method: "DELETE",
    path: "/api/comments/c1",
    action: "ideas.deleteComment",
    params: { id: "c1" },
    body: { authorId: "u1" },
  },
  { method: "GET", path: "/api/groups/g1/goals", action: "goals.listByGroup", params: { id: "g1" } },
  {
    method: "POST",
    path: "/api/groups/g1/goals",
    action: "goals.create",
    params: { id: "g1" },
    body: { title: "Goal" },
  },
  { method: "GET", path: "/api/goals/goal1", action: "goals.getById", params: { id: "goal1" } },
  {
    method: "PUT",
    path: "/api/goals/goal1",
    action: "goals.update",
    params: { id: "goal1" },
    body: { title: "Goal2" },
  },
  { method: "DELETE", path: "/api/goals/goal1", action: "goals.delete", params: { id: "goal1" } },
  {
    method: "GET",
    path: "/api/groups/g1/ai-evaluation-settings",
    action: "aiSettings.listByGroup",
    params: { id: "g1" },
  },
  {
    method: "POST",
    path: "/api/groups/g1/ai-evaluation-settings",
    action: "aiSettings.create",
    params: { id: "g1" },
    body: { goalId: "goal1", selectedIdeaIds: ["i1"] },
  },
  {
    method: "GET",
    path: "/api/ai-evaluation-settings/s1",
    action: "aiSettings.getById",
    params: { id: "s1" },
  },
  {
    method: "GET",
    path: "/api/ai-evaluation-settings/s1/results",
    action: "aiSettings.listResultsBySetting",
    params: { id: "s1" },
  },
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
