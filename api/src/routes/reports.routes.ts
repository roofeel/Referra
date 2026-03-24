import { reportsController } from '../controllers/index.js';

export const reportsRoutes = {
  '/api/reports': {
    GET: reportsController.list,
    POST: reportsController.create,
  },
  '/api/reports/:id/status': {
    PATCH: reportsController.updateStatus,
  },
  '/api/reports/:id': {
    DELETE: reportsController.delete,
  },
};
