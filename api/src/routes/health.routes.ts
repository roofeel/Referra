import { healthController } from "../controllers/index.js";

export const healthRoutes = {
  "/api/health": {
    GET: healthController.check,
  }
};
