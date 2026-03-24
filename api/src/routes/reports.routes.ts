import { reportsController } from '../controllers/index.js';

export const reportsRoutes = {
  '/api/reports': {
    GET: reportsController.list,
  },
};
