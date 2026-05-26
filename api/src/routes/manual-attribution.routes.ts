import { manualAttributedController } from '../controllers/index.js';

export const manualAttributionRoutes = {
  '/api/manual-attribution/attributed/jobs': {
    GET: manualAttributedController.listJobs,
    POST: manualAttributedController.createJob,
  },
  '/api/manual-attribution/attributed/jobs/:jobId': {
    GET: manualAttributedController.getJob,
    PUT: manualAttributedController.updateJob,
    DELETE: manualAttributedController.deleteJob,
  },
  '/api/manual-attribution/attributed/jobs/:jobId/template-variables': {
    GET: manualAttributedController.getTemplateVariables,
  },
  '/api/manual-attribution/attributed/jobs/:jobId/execute': {
    POST: manualAttributedController.executeJob,
  },
};
