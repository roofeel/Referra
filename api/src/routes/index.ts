import { healthRoutes } from "./health.routes.js";
import { usersRoutes } from "./users.routes.js";

export const routes = {
  ...healthRoutes,
  ...usersRoutes,
};
