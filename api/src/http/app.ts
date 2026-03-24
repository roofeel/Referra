import { routes } from "../routes/index.js";

type RouteParams = Record<string, string>;
type AppRequest = Request & { params: RouteParams };
type AppHandler = (req: AppRequest) => Promise<Response> | Response;

type RouteDefinition = {
  regex: RegExp;
  paramNames: string[];
  handlers: Record<string, AppHandler>;
};

const defaultAllowedHeaders = "Content-Type, Authorization";
const allowedMethods = "GET, POST, PUT, DELETE, OPTIONS";

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function compilePath(path: string) {
  const paramNames: string[] = [];
  const regexSource = normalizePath(path).replace(/:[^/]+/g, (segment) => {
    paramNames.push(segment.slice(1));
    return "([^/]+)";
  });

  return {
    regex: new RegExp(`^${regexSource}$`),
    paramNames,
  };
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin");
  const requestHeaders = req.headers.get("access-control-request-headers");
  const headers = new Headers({
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": allowedMethods,
    "Access-Control-Allow-Headers": requestHeaders || defaultAllowedHeaders,
    Vary: "Origin",
  });
  return headers;
}

function withCors(req: Request, response: Response) {
  const headers = new Headers(response.headers);
  getCorsHeaders(req).forEach((value, key) => headers.set(key, value));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function buildRouteDefinitions() {
  return Object.entries(routes).map(([path, handlers]): RouteDefinition => {
    const { regex, paramNames } = compilePath(path);
    return {
      regex,
      paramNames,
      handlers: handlers as Record<string, AppHandler>,
    };
  });
}

const routeDefinitions = buildRouteDefinitions();

function matchRoute(method: string, pathname: string) {
  for (const route of routeDefinitions) {
    const match = route.regex.exec(pathname);
    if (!match) continue;

    const handler = route.handlers[method];
    if (!handler) return { status: 405 as const };

    const params: RouteParams = {};
    route.paramNames.forEach((name, index) => {
      params[name] = decodeURIComponent(match[index + 1] || "");
    });

    return { status: 200 as const, handler, params };
  }

  return { status: 404 as const };
}

export async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return withCors(req, new Response(null, { status: 204 }));
  }

  const url = new URL(req.url);
  const pathname = normalizePath(url.pathname);
  const matched = matchRoute(req.method, pathname);

  if (matched.status === 404) {
    return withCors(req, Response.json({ error: "Not found" }, { status: 404 }));
  }

  if (matched.status === 405) {
    return withCors(
      req,
      Response.json({ error: "Method not allowed" }, { status: 405 }),
    );
  }

  try {
    const requestWithParams = req as AppRequest;
    requestWithParams.params = matched.params;
    const response = await matched.handler(requestWithParams);

    if (!(response instanceof Response)) {
      return withCors(
        req,
        Response.json({ error: "Invalid handler response" }, { status: 500 }),
      );
    }

    return withCors(req, response);
  } catch (error) {
    console.error("Unhandled API error:", error);
    return withCors(
      req,
      Response.json({ error: "Internal server error" }, { status: 500 }),
    );
  }
}
