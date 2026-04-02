import { nonAttributedReportsController } from '../controllers/index.js';

export const nonAttributedReportsRoutes = {
  '/api/non-attributed-reports': {
    GET: nonAttributedReportsController.list,
    POST: nonAttributedReportsController.create,
  },
  '/api/non-attributed-reports/:id/status': {
    PATCH: nonAttributedReportsController.updateStatus,
  },
  '/api/non-attributed-reports/:id/rerun': {
    POST: nonAttributedReportsController.rerun,
  },
  '/api/non-attributed-reports/:id': {
    DELETE: nonAttributedReportsController.delete,
  },
  '/api/non-attributed-reports/:id/logs': {
    GET: nonAttributedReportsController.listLogs,
  },
};
