import { mcpController } from "../controllers/index.js";

export const mcpRoutes = {
  "/api/mcp": {
    POST: mcpController.remote,
  },
};
