import { urlRulesController } from "../controllers/index.js";

export const urlRulesRoutes = {
  "/api/url-rules": {
    GET: urlRulesController.list,
    POST: urlRulesController.create,
  },
  "/api/url-rules/:id": {
    GET: urlRulesController.getById,
    PUT: urlRulesController.update,
    DELETE: urlRulesController.delete,
  },
};
