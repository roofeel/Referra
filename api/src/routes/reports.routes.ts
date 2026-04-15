import { reportsController } from '../controllers/index.js';

export const reportsRoutes = {
  '/api/reports': {
    GET: reportsController.list,
    POST: reportsController.create,
  },
  '/api/reports/:id/status': {
    PATCH: reportsController.updateStatus,
  },
  '/api/reports/:id/rerun': {
    POST: reportsController.rerun,
  },
  '/api/reports/:id': {
    DELETE: reportsController.delete,
  },
  '/api/reports/:id/logs': {
    GET: reportsController.listLogs,
  },
  '/api/reports/:id/detail': {
    GET: reportsController.detail,
  },
  '/api/reports/:id/uid-download': {
    GET: reportsController.downloadUids,
  },
  '/api/reports/:id/attach-related-events': {
    POST: reportsController.attachRelatedEvents,
  },
};
