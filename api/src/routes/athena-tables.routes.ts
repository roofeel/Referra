import { athenaTablesController } from "../controllers/index.js";

export const athenaTablesRoutes = {
  "/api/athena-tables": {
    GET: athenaTablesController.list,
    POST: athenaTablesController.create,
  },
  "/api/athena-tables/:id": {
    GET: athenaTablesController.getById,
    PUT: athenaTablesController.update,
    DELETE: athenaTablesController.delete,
  },
};
