import { healthRoutes } from "./health.routes.js";
import { urlRulesRoutes } from "./url-rules.routes.js";
import { usersRoutes } from "./users.routes.js";

export const routes = {
  ...healthRoutes,
  ...urlRulesRoutes,
  ...usersRoutes,
};
