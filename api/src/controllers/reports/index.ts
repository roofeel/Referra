import { create, attachRelatedEvents, createExportJob, generateUserJourney, updateStatus, rerun, remove } from './command-handlers.js';
import { list, listLogs, detail, downloadUids, getExportFields, getExportJobStatus, getUserJourneyJobStatus } from './query-handlers.js';

export const reportsController = {
  list,
  create,
  listLogs,
  detail,
  downloadUids,
  getExportFields,
  getExportJobStatus,
  getUserJourneyJobStatus,
  attachRelatedEvents,
  generateUserJourney,
  updateStatus,
  rerun,
  createExportJob,
  delete: remove,
};
