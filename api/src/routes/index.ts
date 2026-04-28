import { healthRoutes } from "./health.routes.js";
import { mcpRoutes } from "./mcp.routes.js";
import { nonAttributedReportsRoutes } from "./non-attributed-reports.routes.js";
import { reportsRoutes } from "./reports.routes.js";
import { urlRulesRoutes } from "./url-rules.routes.js";
import { usersRoutes } from "./users.routes.js";

export const routes = {
  ...healthRoutes,
  ...mcpRoutes,
  ...nonAttributedReportsRoutes,
  ...reportsRoutes,
  ...urlRulesRoutes,
  ...usersRoutes,
};
